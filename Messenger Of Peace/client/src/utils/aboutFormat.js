// The About page is written in the dashboard (About Page) with three simple rules:
//   - a normal paragraph (a blank line between paragraphs)  -> paragraph
//   - a line starting with "- "                            -> list item
//   - a line like "Title | Subtitle | Description"         -> card
// and a title like "Kinyarwanda title | English subtitle".

// "A | B" -> ['A', 'B'] (empty parts dropped from the end)
export const splitParts = (line) => String(line || '').split('|').map(p => p.trim())

// Title and optional subtitle of a section.
export const splitTitle = (title) => {
  const [main = '', ...rest] = splitParts(title)
  return { title: main, subtitle: rest.join(' | ') }
}

// Paragraphs, list items and cards of a section's content, in that order of appearance per kind.
export const parseContent = (text) => {
  const paragraphs = []
  const items = []
  const cards = []
  let current = []
  const flush = () => { if (current.length) { paragraphs.push(current.join(' ')); current = [] } }

  for (const raw of String(text || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line.startsWith('- ')) { flush(); items.push(line.slice(2).trim()); continue }
    if (line.includes('|')) { flush(); cards.push(splitParts(line)); continue }
    current.push(line)
  }
  flush()
  return { paragraphs, items, cards }
}

// Every non-empty line as it is (for blocks like the contact lines, where "|" is just text).
export const parseLines = (text) =>
  String(text || '').replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
