import * as yup from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';

import ru from './locales/ru.js';

const init = async () => {
  const defaultLanguage = 'ru';
  const i18nextInstance = i18next.createInstance();
  await i18nextInstance.init({
    lng: defaultLanguage,
    debug: true,
    ru,
  }).then(() => {
    yup.setLocale({
      mixed: {
        valid: i18nextInstance.t('errors.validation.url'),
        notOneOf: i18nextInstance.t('errors.validation.notUnique'),
      },
      string: {
        url: i18nextInstance.t('errors.parseError'),
      },
    });
    return i18nextInstance;
  });
};

const validate = async (url, urls) => {
  const schema = yup.string().required().url().notOneOf(urls);
  return schema.validate(url);
};

const buildInitialState = () => {
  const state = {
    form: {
      valid: null,
      processState: 'filling',
      errors: [],
    },
    feedback: null,
    posts: [],
    feeds: [],
  };
  return state;
};

const app = (i18nextInstance) => {
  init();
  const state = buildInitialState();

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    button: document.querySelector('button[type="submit"]'),
  };

  // написать функция реднера во view.js
  const watchedState = onChange(state, (path, current, previous) => {
    render();
  });

  // добавление слушателя на форму
  elements.form.addEventListener('submit', (e) => {
    watchedState.elements.form.processState = 'processing';
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    const urls = watchedState.feeds.map((feed) => feed.url);
    validate(url, urls)
      .then((validatedUrl) => {
        watchedState.form.valid = true;
        elements.form.reset();
        elements.input.focus();
        return validatedUrl;
      })
      .catch((error) => {
        watchedState.form.valid = false;
        watchedState.form.processState = 'failed';
        watchedState.form.errors.push(error);
      });
  });
};

export default app();
