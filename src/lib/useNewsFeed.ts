import { useEffect, useState } from 'react';
import { getNewsSorted, type NewsItem } from './newsData';
import { subscribeNewsStorage } from './siteNewsStorage';

/** Lista pública de noticias; se actualiza al guardar cambios en el admin. */
export function useNewsFeedSorted(): NewsItem[] {
  const [items, setItems] = useState<NewsItem[]>(() => getNewsSorted());

  useEffect(() => {
    const sync = () => setItems(getNewsSorted());
    const unsub = subscribeNewsStorage(sync);
    return unsub;
  }, []);

  return items;
}
