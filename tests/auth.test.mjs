import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeReturnPath } from '../src/lib/auth/redirect.ts'
import { classifyPersonalAccountExecution } from '../src/lib/auth/function-client.ts'
import { createPersonalAccount, updatePersonalAccount } from '../functions/personal-account/src/handlers.js'

test('return paths preserve local destinations and reject unsafe values', () => {
  for (const value of [undefined, null, 12, '', 'https://example.com', '//example.com', '/\\example.com', '/%5cexample.com', '/%0a', '/%', '/\n']) {
    assert.equal(normalizeReturnPath(value), '/')
  }
  assert.equal(normalizeReturnPath('/profile?tab=details#bio'), '/profile?tab=details#bio')
})

test('auth destinations cannot redirect back into their own guards', () => {
  for (const value of ['/sign-in', '/sign-in?redirect=/profile', '/onboarding/', '/%73ign-in', '/profile/../onboarding']) {
    assert.equal(normalizeReturnPath(value), '/')
  }
})

const account = {
  personalAccountId: 'test-account', firstName: 'Test', lastName: 'User',
  role: 'property_owner', contactEmail: null, bio: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

test('Function status is checked independently of transport success', () => {
  for (const statusCode of [200, 201]) {
    assert.deepEqual(classifyPersonalAccountExecution({ method: 'POST', statusCode, body: JSON.stringify(account) }), { ok: true, personalAccount: account })
  }
  for (const [method, statusCode, code] of [
    ['GET', 404, 'needs_onboarding'], ['PATCH', 404, 'function_error'],
    ['POST', 404, 'function_error'], ['GET', 401, 'invalid_session'],
    ['POST', 409, 'conflict'], ['PATCH', 400, 'invalid_request'],
    ['GET', 500, 'function_error'], ['GET', 0, 'function_error'],
  ]) {
    const result = classifyPersonalAccountExecution({ method, statusCode, body: '{}' })
    assert.equal(result.ok, false)
    assert.equal(result.code, code)
  }
})

test('malformed success bodies fail safely; validation issues survive', () => {
  for (const body of ['', 'invalid JSON', '{}', 'null']) {
    assert.equal(classifyPersonalAccountExecution({ method: 'GET', statusCode: 200, body }).code, 'function_error')
  }
  const issues = [{ field: 'firstName', message: 'Required' }]
  assert.deepEqual(classifyPersonalAccountExecution({ method: 'PATCH', statusCode: 400, body: JSON.stringify({ issues }) }).issues, issues)
})

const row = {
  $id: 'test-row', $createdAt: account.createdAt, $updatedAt: account.updatedAt,
  first_name: 'Test', last_name: 'User', role: 'property_owner',
  contact_email: 'test@example.com', bio: 'Example',
}
const res = { json: (body, status) => ({ body, status }) }
const body = { firstName: 'Test', lastName: 'User', role: 'property_owner' }

test('same-role retry reuses the account; a different role conflicts', async () => {
  const deps = { tables: {
    listRows: async () => ({ rows: [row] }),
    createRow: () => assert.fail('must not create again'),
  } }
  assert.equal((await createPersonalAccount(deps, 'test-user', body, res)).status, 200)
  await assert.rejects(createPersonalAccount(deps, 'test-user', { ...body, role: 'realtor' }, res), error => error.status === 409)
})

test('concurrent creates reconcile the unique-index winner (mocked storage)', async () => {
  let reads = 0
  let stored = null
  const deps = { log() {}, tables: {
    // Both requests see no row before either reaches the simulated unique index.
    listRows: async () => ({ rows: ++reads <= 2 ? [] : [stored] }),
    createRow: async () => {
      if (stored) throw new Error('Simulated unique constraint')
      stored = row
      return row
    },
  } }
  const results = await Promise.all([
    createPersonalAccount(deps, 'test-user', body, res),
    createPersonalAccount(deps, 'test-user', body, res),
  ])
  assert.deepEqual(results.map(result => result.status).sort(), [200, 201])
  assert.equal(results[0].body.personalAccountId, results[1].body.personalAccountId)
})

test('PATCH clears optional fields and cannot change ownership or role', async () => {
  let patch
  const deps = { tables: {
    listRows: async () => ({ rows: [row] }),
    updateRow: async args => {
      patch = args.data
      return { ...row, ...args.data }
    },
  } }
  const result = await updatePersonalAccount(deps, 'test-user', {
    contactEmail: null, bio: null, role: 'realtor', appwrite_user_id: 'other-user',
  }, res)
  assert.deepEqual(patch, { contact_email: null, bio: null })
  assert.equal(result.body.role, 'property_owner')
  assert.equal(result.body.contactEmail, null)
  assert.equal(result.body.bio, null)
  await assert.rejects(updatePersonalAccount(deps, 'test-user', { bio: '' }, res), error => error.status === 400)
})
