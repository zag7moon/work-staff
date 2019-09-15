/*
 *  Save scroll position even if page reloader for elements which has data-params.
 *
 *  @param data-scroll-keep - enables scroll saving for element and defines which directions should be saved.
 *  @param data-scroll-key - unique per page element key
 *
 *  Example:
 *
 *  <div data-scroll-keep='left,top,right,bottom' data-scroll-key='any-unique-key'>
 *    Some scrollable content
 *  </div>
 *
 */


document.addEventListener("DOMContentLoaded", () => {
  const capitalize = s => s && s[0].toUpperCase() + s.slice(1);

  const DATA_SCROLL_MAIN = 'data-scroll-keep';
  const DATA_SCROLL_KEY = 'data-scroll-key';
  const STORAGE_KEY = 'scroll-position'

  const scrollableElements = document.querySelectorAll(`[${DATA_SCROLL_MAIN}]`)

  scrollableElements.forEach(scrollableElement => {
    const key = scrollableElement.getAttribute(DATA_SCROLL_KEY)
    const directionString = scrollableElement.getAttribute(DATA_SCROLL_MAIN)
    const directions = directionString.split(',')
    const storageKey = `${STORAGE_KEY}-${key}`

    directions.forEach(dr => {
      const scrollPosition = sessionStorage.getItem(`${storageKey}-${dr}`)
      if (scrollPosition) {
        scrollableElement[`scroll${capitalize(dr)}`] = scrollPosition
      }
    })

    scrollableElement.addEventListener('scroll', (e) => {
      directions.forEach(dr => {
        sessionStorage.setItem(`${storageKey}-${dr}`, e.target[`scroll${capitalize(dr)}`])
      })
    })
  })
});

