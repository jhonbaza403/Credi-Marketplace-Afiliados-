export class CrediClient {
  constructor({ baseUrl, apiKey }) { this.baseUrl = baseUrl.replace(/\/$/, ''); this.apiKey = apiKey }
  async request(path, init = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Credi API ${response.status}`)
    return data
  }
  catalog(q = '') { return this.request(`/api/v1/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`) }
  checkoutIntent(input) { return this.request('/api/v1/checkout/intent', { method: 'POST', body: JSON.stringify(input) }) }
}
