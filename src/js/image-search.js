import { Notify } from 'notiflix/build/notiflix-notify-aio';
import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';
import throttle from 'lodash.throttle';
import createCardMarkup from './template/card-markup.hbs';
import PixabayApi from './pixabayAPI';

const gallery = new SimpleLightbox('.photo-card');
const refs = {
    form: document.querySelector('#search-form'),
    gallery: document.querySelector('.gallery__container'),
    moreBtn: document.querySelector('.load-more'),
};
const pixabayApi = new PixabayApi();
const onScrollThrottle = throttle(onScroll, 250);
let isScroll = false;

refs.form.addEventListener('submit', onSearch);

async function onSearch(evt) {
    evt.preventDefault();
    pixabayApi.pageReset();
    clearGallery();
    pixabayApi.query = evt.target.searchQuery.value.trim();
    await loadMore();
    if (!isScroll) {
        window.addEventListener('scroll', onScrollThrottle);
        isScroll = true;
    }
}
async function loadMore() {
  try {
    const response = await pixabayApi.getImages();
    onResolve(response);
  } catch (error) {
    onReject(error);
  }
}
function onResolve(response) {
  const cards = response.data.hits;
  const totalHits = response.data.totalHits;
  if (cards.length === 0 && totalHits === 0) {
    Notify.failure('Sorry, there are no images matching your search query. Please try again.');
    window.removeEventListener('scroll', onScrollThrottle);
    isScroll = false;
    return;
  }
  if (cards.length === 0 && totalHits !== 0) {
    Notify.failure("We're sorry, but you've reached the end of search results.");
    window.removeEventListener('scroll', onScrollThrottle);
    isScroll = false;
    return;
  }
  if (pixabayApi.page === 2) {
    Notify.success(`Hooray! We found ${totalHits} images.`);
  }
  const cardsMarkup = createCards(cards);

  addCards(cardsMarkup);
  gallery.refresh();
}
function onReject(error) {
  window.removeEventListener('scroll', onScrollThrottle);
  isScroll = false;
  if (error.response.status === 400) {
    Notify.failure("We're sorry, but you've reached the end of search results.");
    return;
  }
  Notify.failure('Sorry, there is no response from server. Please try again.');
}
function createCards(cards) {
  return cards.map(createCardMarkup).join('');
}
function addCards(markup) {
  refs.gallery.insertAdjacentHTML('beforeend', markup);
}
function clearGallery() {
  refs.gallery.innerHTML = '';
}
async function onScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const { height: cardHeight } = refs.gallery.firstElementChild.getBoundingClientRect();

  if (scrollTop + clientHeight < scrollHeight - cardHeight) {
    return;
  }
  await loadMore();
}