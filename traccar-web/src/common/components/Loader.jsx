import { useEffect } from 'react';

const Loader = () => {
  useEffect(() => {
    const loader = document.querySelector('.loader');
    if (loader) {
      loader.style.display = '';
      return () => {
        loader.style.display = 'none';
      };
    }
    return undefined;
  }, []);
  return null;
};

export default Loader;
