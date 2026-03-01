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

interface ResetPasswordProps {
  resetUrl: string
}

export function ResetPassword({ resetUrl }: ResetPasswordProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9f9f9", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px", fontWeight: "600", color: "#111111", marginBottom: "8px" }}>
            Reset your Brief password
          </Heading>
          <Text style={{ fontSize: "15px", color: "#444444", lineHeight: "1.5", marginBottom: "24px" }}>
            We received a request to reset the password for your Brief account.
            Click the button below to choose a new password. This link expires in 1 hour.
          </Text>
          <Button
            href={resetUrl}
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
            Reset password
          </Button>
          <Hr style={{ borderColor: "#eeeeee", marginTop: "32px", marginBottom: "16px" }} />
          <Text style={{ fontSize: "12px", color: "#999999", lineHeight: "1.5" }}>
            If you did not request a password reset, ignore this email — your password has not been changed.
            This link will expire automatically.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ResetPassword
