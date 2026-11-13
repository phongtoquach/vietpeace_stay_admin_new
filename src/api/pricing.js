import { apiFetch } from './client';
const get = async (path, signal) => (await apiFetch(`/pricing${path}`, {
  signal
})).data;
const send = async (path, body, method = 'POST') => (await apiFetch(`/pricing${path}`, {
  method,
  body: JSON.stringify(body)
})).data;
export const pricingApi = {
  bootstrap: signal => get('/bootstrap', signal),
  calendar: (params, signal) => get(`/calendar?${new URLSearchParams(params)}`, signal),
  history: (params, signal) => get(`/history?${new URLSearchParams(params)}`, signal),
  proposals: (params, signal) => get(`/proposals?${new URLSearchParams(params)}`, signal),
  reviewProposal: (id, decision, body) => send(`/proposals/${id}/${decision}`, body),
  preview: body => send('/preview', body),
  apply: body => send('/apply', body),
  savePeriod: (body, id) => send(id ? `/periods/${id}` : '/periods', body, id ? 'PUT' : 'POST'),
  archivePeriod: period => send(`/periods/${period.id}`, {
    versionToken: period.versionToken
  }, 'DELETE')
};
