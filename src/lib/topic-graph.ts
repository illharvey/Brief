// Hardcoded per CONTEXT.md — no ML/collaborative filtering for v1
const TOPIC_ADJACENCY: Record<string, string[]> = {
  "AI": ["Machine Learning", "Robotics", "Tech Policy", "Data Science"],
  "Technology": ["AI", "Cybersecurity", "Startups", "Software"],
  "Finance": ["Economics", "Crypto", "Business", "Investing"],
  "Politics": ["Policy", "International Relations", "Economics"],
  "Climate": ["Environment", "Energy", "Science", "Policy"],
  "Science": ["Space", "Health", "Technology", "Climate"],
  "Health": ["Science", "Nutrition", "Mental Health", "Medicine"],
  "Sport": ["Football", "Cricket", "Tennis", "Olympics"],
  "Culture": ["Film", "Music", "Books", "Art"],
  "Business": ["Finance", "Startups", "Economics", "Technology"],
  "Space": ["Science", "Technology", "Engineering"],
  "Design": ["UX", "Architecture", "Art", "Technology"],
  "Crypto": ["Finance", "Technology", "Blockchain", "Economics"],
  "Food": ["Nutrition", "Health", "Culture", "Travel"],
  "Travel": ["Culture", "Food", "Geography", "Adventure"],
  "Formula 1": ["Sport", "Technology", "Engineering"],
  "Football": ["Sport", "Culture"],
  "Economics": ["Finance", "Politics", "Business"],
  "Environment": ["Climate", "Science", "Policy"],
  "Mental Health": ["Health", "Science"],
}

export function getAdjacentTopics(userTopics: string[], limit = 4): string[] {
  const suggestions = new Set<string>()
  const userTopicSet = new Set(userTopics.map(t => t.toLowerCase()))

  for (const topic of userTopics) {
    const adjacent = TOPIC_ADJACENCY[topic] ?? []
    for (const suggestion of adjacent) {
      if (!userTopicSet.has(suggestion.toLowerCase())) {
        suggestions.add(suggestion)
      }
    }
    if (suggestions.size >= limit) break
  }

  return Array.from(suggestions).slice(0, limit)
}
