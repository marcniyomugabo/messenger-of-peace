// Shared by the News page, a story's page and "Latest news" on Home.

// Picture shown when a story has none.
export const NEWS_PHOTO = '/images/bg2.jpeg'

export const newsDate = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

// Paragraphs of a story: an empty line separates them (stories are plain text, shown safely).
export const paragraphs = text => String(text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

// The summary, or the start of the story.
export const summary = (story, max = 160) => {
  const text = story.excerpt || paragraphs(story.content)[0] || ''
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text
}
