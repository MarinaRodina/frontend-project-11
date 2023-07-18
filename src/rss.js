import axios from 'axios';

const getUrlWithProxy = (url) => {
  const urlWithProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlWithProxy.searchParams.set('url', url);
  urlWithProxy.searchParams.set('disableCache', 'true');
  return urlWithProxy.toString();
  };
  
const getHttp = (url) => {
  const urlWithProxy = getUrlWithProxy(url);
  return axios.get(urlWithProxy);
};

export default getHttp;