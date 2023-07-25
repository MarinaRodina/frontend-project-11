import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import parseRss from './parsefeed.js';
import watch from './view.js';
import resources from './locales/index.js';

const defaultLanguage = 'ru';

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
  return schema
    .validate(url)
    .then(() => null);
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
    .then((data) => ({ url, rss: parseRss(data.contents) }))
    .catch((err) => {
      throw err.message === 'Network Error' ? new Error('networkError') : err;
    });
};

const addPosts = (rss) => {
  const items = rss.querySelectorAll('item');
  const posts = [];
  items.forEach((item) => {
    const title = item.querySelector('title').textContent;
    const description = item.querySelector('description').textContent;
    const link = item.querySelector('link').textContent;
    const id = item.querySelector('guid').textContent;
    posts.push({
      title, description, link, id,
    });
  });
  return posts;
};

const addFeeds = (rss) => {
  const feed = rss.querySelector('channel');
  const title = feed.querySelector('title').textContent;
  const description = feed.querySelector('description').textContent;
  return { title, description };
};

const distributeRss = (data, state) => {
  const { url, rss } = data;
  const feed = addFeeds(rss);
  const posts = addPosts(rss);
  state.urls.push(url);
  state.feeds.push(feed);
  state.posts.push(...posts);
  // eslint-disable-next-line no-param-reassign
  state.loadingProcess.state = 'success';
};

const updateRss = (state, time) => {
  setTimeout(() => {
    const { urls } = state;
    const newRss = urls.map(getRss);
    const oldPosts = state.posts;
    Promise.all(newRss).then((item) => {
      const newPosts = item.map(({ rss }) => addPosts(rss));
      const uniquePosts = newPosts
        .flat()
        .filter((newPost) => !oldPosts.some((oldPost) => oldPost.id === newPost.id));
      if (uniquePosts.length > 0) {
      // eslint-disable-next-line no-param-reassign
        state.posts = [...uniquePosts, ...state.posts];
      }
    });
    updateRss(state, time);
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
  updateRss(watchedState, 5000);
};

export default () => {
  init().then((i18nextInstance) => app(i18nextInstance));
};
