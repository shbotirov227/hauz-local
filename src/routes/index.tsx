import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <h1>Find your place with HAUZ</h1>
      <p>
        Keep your personal account details current and ready for your next move.
      </p>
      <p>
        <Link to="/profile">View your profile</Link>
      </p>
    </main>
  )
}
