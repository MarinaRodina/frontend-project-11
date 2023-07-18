const parseFeed = (contents) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(contents, 'text/xml');
    const error = xmlDoc.querySelector('parsererror');
    if (error) {
      throw new Error(i18nextInstance.t('errors.parseError'));
    }

    const feedTitle = xmlDoc.querySelector('channel > title').textContent;
    const feedDescription = xmlDoc.querySelector('channel > description').textContent;
    const feed = { title: feedTitle, description: feedDescription };

    const postElements = xmlDoc.querySelectorAll('item');
    const posts = [...postElements].map((element) => {
      const title = element.querySelector('title').textContent;
      const description = element.querySelector('description').textContent;
      const link = element.querySelector('link').textContent;
      const post = {
        title,
        description,
        link,
      };
      return post;
    });
    return { feed, posts };
  };
  
  export default parseFeed;
