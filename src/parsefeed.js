const parseFeed = (data) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('parseError');
  }

  const feedTitle = xmlDoc.querySelector('channel > title').textContent;
  const feedDescription = xmlDoc.querySelector('channel > description').textContent;
  const feed = { title: feedTitle, description: feedDescription };

  const postElements = xmlDoc.querySelectorAll('item');
  const posts = [...postElements].map((element) => {
    const title = element.querySelector('title').textContent;
    const description = element.querySelector('description').textContent;
    const link = element.querySelector('link').textContent;
    const id = element.querySelector('guid').textContent;
    const post = {
      title,
      description,
      link,
      id,
    };
    return post;
  });
  return { feed, posts };
};

export default parseFeed;
