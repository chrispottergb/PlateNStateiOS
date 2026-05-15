/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Plate N' State"
const SITE_URL = 'https://platenstate.com'

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — because honking isn't enough™</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>
            {name ? `Welcome, ${name}!` : 'Welcome to the Patrol!'}
          </Heading>
        </Section>

        <Text style={text}>
          You're in. {SITE_NAME} is the community-powered way to call out bad
          drivers, protect your own plate, and keep an eye on your neighborhood.
        </Text>

        <Text style={text}>
          You start with <strong>20 free coins this month</strong> — each report
          costs 1 coin. Verified reports earn you bonus coins and XP.
        </Text>

        <Section style={ctaWrap}>
          <Button href={SITE_URL} style={button}>
            Open the app
          </Button>
        </Section>

        <Text style={subtext}>
          Quick tips:
          <br />• Snap a plate with the camera scanner
          <br />• Claim your own plate to get notified if it's reported
          <br />• Climb the leaderboard with a daily reporting streak
        </Text>

        <Text style={footer}>
          — The {SITE_NAME} team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: "Welcome to Plate N' State 🚗",
  displayName: 'Welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const header = { marginBottom: '24px' }
const h1 = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#0a0a0a',
  margin: '0 0 8px',
  letterSpacing: '-0.02em',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const subtext = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.7',
  margin: '24px 0 0',
}
const ctaWrap = { margin: '28px 0', textAlign: 'center' as const }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '999px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '32px 0 0',
}
