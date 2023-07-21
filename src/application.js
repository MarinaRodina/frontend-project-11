import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import parseRss from './parsefeed.js';
import watch from './view.js';
import resources from './locales/index.js';

const elements = {
  form: document.querySelector('.rss-form'),
  submit: document.querySelector('button[type="submit"]'),
  input: document.querySelector('#url-input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('.feeds'),
  posts: document.querySelector('.posts'),
};
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
  const schema = yup.string().url().notOneOf(urls).required();
  return schema
    .validate(url)
    .then(() => null)
    .catch((error) => error.message);
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

const app = (i18nextInstance) => {
  const initState = buildInitialState();
  const watchedState = watch(elements, i18nextInstance, initState);
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    validate(url, watchedState.urls).then((error) => {
      if (error) {
        watchedState.form.valid = false;
        watchedState.form.message = error;
        return;
      }
      watchedState.form.valid = true;
      watchedState.loadingProcess.state = 'loading';
      getRss(url)
        .then((data) => distributeRss(data, watchedState))
        .catch((err) => {
          const { message } = err;
          watchedState.form.valid = false;
          watchedState.loadingProcess.state = 'failed';
          if (message === 'parseError' || message === 'networkError') {
            watchedState.form.message = i18nextInstance.t(`errors.${message}`);
          } else {
            watchedState.form.message = message;
          }
        })
        .finally(() => {
          watchedState.loadingProcess.state = 'waiting';
        });
    });
  });
};

export default () => {
  init().then((i18nextInstance) => app(i18nextInstance));
};
