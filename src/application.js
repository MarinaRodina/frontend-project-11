import * as yup from 'yup';
import onChange from 'on-change';

const validate = async (url, urls) => {
  const schema = yup.string().required().url().notOneOf(urls);  
  return schema.validate(url);
};

const app = () => {
  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    button: document.querySelector('button[type="submit"]'),
  };

  const state = {
    form: {
      valid: true,
      processState: 'filling',
      errors: [],
    },
    posts: [],
    feeds: [],
  };

  //написать функция реднера во view.js
  const watchedState = onChange(state, (path, current, previous) => {
    render(......);
  })

  // добавление слушателя на форму
    form.addEventListener('submit', (e) => {
    watchedState.form.processState = 'processing';
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    const urls = watchedState.feeds.map((feed) => feed.url);
    validate(url, urls)
      .then((validatedUrl) => {
        watchedState.form.valid = true;
        input.reset();
        input.focus();
        return validatedUrl;
      })
      .catch((error) => {
        watchedState.form.valid = false;
        watchedState.form.processState = 'error';
      });
  });
};

 export default app();