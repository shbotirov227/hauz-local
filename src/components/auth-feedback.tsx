import type { AuthError } from '../lib/auth/types'

export function AuthFeedback({ error }: { error: AuthError | null }) {
  if (!error) {
    return null
  }

  return (
    <div className="error-summary" role="alert">
      <p>{error.message}</p>
      {error.issues?.length ? (
        <ul>
          {error.issues.map((issue, index) => (
            <li key={`${issue.field}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
