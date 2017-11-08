class NewsController {
  constructor () {
    this._newsSections = []
    this._db = this._initDb()

    this._registerServiceWorker()
    this._getArticlesFromDb()
    this._getArticles()
  }

  _getArticles () {
    fetch(`https://content.guardianapis.com/search?api-key=${apiKey}&show-fields=thumbnail`)
    .then(response => {
      if (response.status === 200) {
        return response.json()
      }
      throw new Error(`Couldn't connect to the server`)
    })
    .then(responseJson => {
      const articles = responseJson.response.results
      
      this._cacheArticles(articles)
      this._getArticlesFromDb()
    })
    .catch(error => console.log(error))
  }

  _categoriseNews (articles) {
    this._newsSections = []

    articles.forEach(article => {
      const exisitingNewsSection = this._newsSections.find(newsSection => {
        return newsSection.title === article.sectionName
      })

      if (exisitingNewsSection) {
        exisitingNewsSection.articles.push(article)
      } else {
        this._newsSections.push({
          title: article.sectionName,
          articles: [article]
        })
      }
    })
  }

  _updateDOM () {
    const articlesElement = document.querySelector('#articles')
    articlesElement.innerHTML = ''

    this._newsSections.forEach(newsSection => {
      articlesElement.innerHTML += `
      <div class="section-heading">
      <h2>${newsSection.title}</h2>
      </div>
      `

      newsSection.articles.forEach(article => {
        const thumbnail = article.fields ? `<img src="${article.fields.thumbnail}" class="thumbnail"></img>` : ``

        articlesElement.innerHTML += `
        <a href="https://theguardian.com/${article.id}" class="article">
        ${thumbnail}
        <div class="title">
        <h3>${article.webTitle}</h3>
        </div>
        </a>
        `
      })
    })
  }

  _registerServiceWorker () {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('../service-worker.js')
      .then((register) => {
        console.log('[Service Worker] Registered')
      })
    }
  }

  _initDb () {
    return new Promise(resolve => {
      const dbOpen = indexedDB.open('test-db', 1)

      dbOpen.onupgradeneeded = () => {
        const database = dbOpen.result

        const articleStore = database.createObjectStore('articles', { keypath: 'id' })
        articleStore.createIndex('by_id', 'id', { unique: true })
      }
      dbOpen.onsuccess = () => {
        const database = dbOpen.result

        resolve(database)
      }
    })
  }

  _cacheArticles (articles) {
    this._db
    .then(database => {
      const articlesStore = database.transaction('articles', 'readwrite').objectStore('articles')

      articles.forEach(article => articlesStore.put(article))
    })
  }

  _getArticlesFromDb () {
    this._db
    .then(database => {
      const articlesStore = database.transaction('articles').objectStore('articles')
      const articlesQuery = articlesStore.index('by_id').getAll()

      articlesQuery.onsuccess = () => {
        this._categoriseNews(articlesQuery.result)
        this._updateDOM()
      }
    })
  }
}

const newsController = new NewsController()
