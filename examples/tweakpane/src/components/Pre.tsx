import React from 'react'

export const Pre = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <div style={{ fontSize: '0.8em', color: '#888' }}>{label}</div>
    <div style={{ fontFamily: 'monospace' }}>{children}</div>
  </div>
)
