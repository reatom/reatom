type Fields = Record<string, unknown>
const performanceKeys = {
  duration: 'duration',
  tcp_handshake_time: 'tcpHandshakeTime',
  dns_lookup_time: 'dnsLookupTime',
  tls_negotiation_time: 'tlsNegotiationTime',
  redirect_time: 'redirectTime',
  request_time: 'requestTime',
  response_time: 'responseTime',
  fetch_time: 'fetchTime',
  service_worker_time: 'serviceWorkerTime',
  decoded_body_size: 'decodedBodySize',
  encoded_body_size: 'encodedBodySize',
  transfer_size: 'transferSize',
  ttfb: 'ttfb',
  response_status: 'responseStatus',
  render_blocking_status: 'renderBlockingStatus',
  initiator_type: 'initiatorType',
  cache_hit_status: 'cacheHitStatus',
  protocol: 'protocol',
  http_host: 'httpHost',
  visibility_state: 'visibilityState',
  navigation_entry_id: 'faroNavigationId',
} as const
const navigationKeys = {
  page_load_time: 'pageLoadTime',
  document_parsing_time: 'documentParsingTime',
  dom_processing_time: 'domProcessingTime',
  dom_content_load_handler_time: 'domContentLoadHandlerTime',
  on_load_time: 'onLoadTime',
  navigation_type: 'type',
  previous_navigation_entry_id: 'faroPreviousNavigationId',
} as const
const timingString = (value: unknown): string =>
  typeof value === 'number'
    ? Number.isFinite(value)
      ? String(Math.round(Math.max(0, value)))
      : 'unknown'
    : typeof value === 'string'
      ? value
      : 'unknown'

/**
 * Converts only explicitly canonical browser signals; legacy measurements stay
 * intact.
 */
export const nativeEvent = (
  name: string,
  fields: Fields,
  context: Record<string, string>,
): Fields => {
  if (
    name === 'browser.performance.navigation' ||
    name === 'browser.performance.resource'
  ) {
    const navigation = name.endsWith('.navigation')
    const attributes: Record<string, string> = {
      ...context,
      name: timingString(fields['url.full']),
    }
    for (const [key, native] of Object.entries({
      ...performanceKeys,
      ...(navigation
        ? navigationKeys
        : { resource_entry_id: 'faroResourceId' }),
    }))
      attributes[native] = timingString(fields[`performance.${key}`])
    return { name: name.replace('browser.', 'faro.'), attributes }
  }
  if (name === 'browser.user_action') {
    const attributes: Record<string, string> = { ...context }
    for (const [key, native] of Object.entries({
      name: 'userActionName',
      start_time: 'userActionStartTime',
      end_time: 'userActionEndTime',
      duration: 'userActionDuration',
      trigger: 'userActionTrigger',
      importance: 'userActionImportance',
    })) {
      const value = fields[`action.${key}`]
      attributes[native] =
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
          ? String(value)
          : 'unknown'
    }
    const id = fields['action.id'],
      actionName = fields['action.name']
    return {
      name: 'faro.user.action',
      attributes,
      ...(typeof id === 'string' &&
        typeof actionName === 'string' && { action: { id, name: actionName } }),
    }
  }
  if (name === 'app.view_change')
    return {
      name: 'view_changed',
      attributes: {
        ...context,
        fromView:
          typeof fields.fromView === 'string' ? fields.fromView : 'unknown',
        toView: typeof fields.toView === 'string' ? fields.toView : 'unknown',
      },
    }
  return {
    name:
      name === 'session.start'
        ? 'session_start'
        : name.startsWith('browser.frustration.')
          ? name.replace('browser.', 'faro.')
          : name,
    attributes: context,
  }
}
