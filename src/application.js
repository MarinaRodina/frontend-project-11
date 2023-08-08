import * as yup from 'yup';
import _ from 'lodash';
import i18next from 'i18next';
import axios from 'axios';
import parseFeed from './parsefeed.js';
import watch from './view.js';
import resources from './locales/index.js';

const defaultLanguage = 'ru';
const delay = 5000;

const init = async () => {
  const i18nextInstance = i18next.createInstance();
  return i18nextInstance.init({
    lng: defaultLanguage,
    debug: false,
    resources,
  }).then(() => {
    yup.setLocale({
      mixed: {
        required: i18nextInstance.t('errors.required'),
        notOneOf: i18nextInstance.t('errors.alreadyExists'),
      },
      string: {
        url: i18nextInstance.t('errors.invalidUrl'),
      },
    });
    return i18nextInstance;
  });
};

const validate = (url, urls) => {
  const schema = yup.string().url().trim().notOneOf(urls)
    .required();
  return schema.validate(url);
};

const buildInitialState = () => {
  const state = {
    form: {
      valid: true,
      message: '',
    },
    loadingProcess: {
      state: 'waiting',
      message: '',
    },
    posts: [],
    feeds: [],
    urls: [],
    uiState: {
      modalBox: '',
      viewedLinks: [],
    },
  };
  return state;
};

const getRss = (url) => {
  const proxyUrl = new URL('get', 'https://allorigins.hexlet.app');
  proxyUrl.searchParams.set('disableCache', true);
  proxyUrl.searchParams.set('url', url);
  return axios
    .get(proxyUrl)
    .then((response) => response.data)
    .then((data) => ({ url, rss: parseFeed(data.contents) }))
    .then((content) => {
      const { rss } = content;
      const { posts } = rss;
      posts.forEach((post) => {
        const id = _.uniqueId();
        post.id = id;
      });
      return content;
    })
    .catch((err) => {
      throw err.message === 'Network Error' ? new Error('networkError') : err;
    });
};

const distributeRss = (data, state) => {
  const { url, rss } = data;
  const { feed, posts } = rss;
  state.urls.push(url);
  state.feeds.push(feed);

  state.posts.push(...posts);
  state.loadingProcess.state = 'success';
};

const updateRss = (state, time) => {
  setTimeout(() => {
    const oldPosts = state.posts;
    const { urls } = state;
    const newRss = urls.map(getRss);
    Promise.all(newRss)
      .then((item) => {
        const newPosts = item.map(({ rss }) => {
          console.log(item);
          const { posts } = rss;
          return posts;
        });
        const uniquePosts = newPosts
          .flat()
          .filter((newPost) => !oldPosts.some((oldPost) => oldPost.title === newPost.title));
        if (uniquePosts.length > 0) {
          state.posts.push(...uniquePosts);
        }
      })
      .finally(() => updateRss(state, time))
      .catch(() => null);
  }, time);
};

const app = (i18nextInstance) => {
  const elements = {
    form: document.querySelector('.rss-form'),
    feedback: document.querySelector('.feedback'),
    input: document.querySelector('#url-input'),
    submit: document.querySelector('button[type="submit"]'),
    posts: document.querySelector('.posts'),
    feeds: document.querySelector('.feeds'),
    modal: document.querySelector('#modal'),
  };
  const initialState = buildInitialState();
  const watchedState = watch(elements, i18nextInstance, initialState);
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    watchedState.loadingProcess.state = 'loading';
    validate(url, watchedState.urls)
      .then(() => {
        watchedState.form.valid = true;
        return getRss(url);
      })
      .then((data) => distributeRss(data, watchedState))
      .finally(() => {
        watchedState.loadingProcess.state = 'waiting';
      })
      .catch((err) => {
        const { message } = err;
        watchedState.form.valid = false;
        watchedState.loadingProcess.state = 'failed';
        if (message === 'parseError' || message === 'networkError') {
          watchedState.form.message = i18nextInstance.t(`errors.${message}`);
        } else {
          watchedState.form.message = message;
        }
      });
  });

  elements.posts.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
      watchedState.uiState.viewedLinks.push(event.target.dataset.id);
    }
    if (event.target.tagName === 'BUTTON') {
      watchedState.uiState.modalBox = event.target.dataset.id;
      watchedState.uiState.viewedLinks.push(event.target.dataset.id);
    }
  });
  updateRss(watchedState, delay);
};

export default () => {
  init().then((i18nextInstance) => app(i18nextInstance));
};
