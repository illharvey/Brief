import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface VerifyEmailProps {
  verifyUrl: string
}

export function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px", fontWeight: "600", color: "#111111", marginBottom: "8px" }}>
            Verify your Brief email address
          </Heading>
          <Text style={{ fontSize: "15px", color: "#444444", lineHeight: "1.5", marginBottom: "24px" }}>
            Click the button below to verify your email address and start receiving your daily briefing.
            This link expires in 24 hours.
          </Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: "15px",
              fontWeight: "500",
            }}
          >
            Verify email address
          </Button>
          <Hr style={{ borderColor: "#eeeeee", marginTop: "32px", marginBottom: "16px" }} />
          <Text style={{ fontSize: "12px", color: "#999999", lineHeight: "1.5" }}>
            If you did not create a Brief account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default VerifyEmail
