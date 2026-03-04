import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Link,
  Section,
} from "@react-email/components"

export interface BriefingTopicSection {
  topicName: string
  items: Array<{
    headline: string
    summary: string       // 1-2 sentences (plain text, not markdown bullets)
    articleUrl: string
    sourceName: string
  }>
}

interface BriefingEmailProps {
  userName: string
  date: string            // e.g. "Wednesday, 4 March 2026"
  topics: BriefingTopicSection[]   // pre-filtered: empty topics excluded; items capped at 5
  preferencesUrl: string
  unsubscribeUrl: string
}

const bodyStyle = { fontFamily: "sans-serif", backgroundColor: "#f9f9f9", margin: 0, padding: 0 } as const
const containerStyle = { maxWidth: "560px", margin: "40px auto", padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px" } as const

export function BriefingEmail({ userName, date, topics, preferencesUrl, unsubscribeUrl }: BriefingEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={{ fontSize: "22px", fontWeight: "700", color: "#111111", marginBottom: "4px" }}>
            Brief
          </Heading>
          <Text style={{ fontSize: "13px", color: "#888888", margin: "0 0 4px" }}>{date}</Text>
          <Text style={{ fontSize: "15px", color: "#444444", margin: "0 0 24px" }}>
            Good morning, {userName} — your Brief is ready.
          </Text>
          <Hr style={{ borderColor: "#eeeeee", margin: "0 0 24px" }} />

          {topics.map((section) => (
            <Section key={section.topicName}>
              <Heading as="h2" style={{ fontSize: "15px", fontWeight: "700", color: "#111111", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {section.topicName}
              </Heading>
              {section.items.map((item, i) => (
                <Section key={i} style={{ marginBottom: "16px" }}>
                  <Text style={{ fontWeight: "600", color: "#111111", margin: "0 0 2px", fontSize: "14px" }}>
                    <Link href={item.articleUrl} style={{ color: "#111111", textDecoration: "none" }}>
                      {item.headline}
                    </Link>
                  </Text>
                  <Text style={{ color: "#444444", margin: "0 0 2px", fontSize: "14px", lineHeight: "1.5" }}>
                    {item.summary}
                  </Text>
                  <Text style={{ fontSize: "11px", color: "#999999", margin: 0 }}>
                    {item.sourceName}
                  </Text>
                </Section>
              ))}
              <Hr style={{ borderColor: "#eeeeee", margin: "16px 0" }} />
            </Section>
          ))}

          <Text style={{ fontSize: "11px", color: "#999999", margin: "16px 0 0" }}>
            <Link href={preferencesUrl} style={{ color: "#999999" }}>Preferences</Link>
            {" · "}
            <Link href={unsubscribeUrl} style={{ color: "#999999" }}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BriefingEmail
