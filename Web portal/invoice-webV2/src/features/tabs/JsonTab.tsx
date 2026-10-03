import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import { Button } from '../../components/common/Button';

interface JsonTabProps {
  data: Record<string, unknown>;
}

export const JsonTab: React.FC<JsonTabProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Code size={16} color="var(--navy-800)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Raw Snapshot JSON Payload</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
          onClick={handleCopy}
        >
          {copied ? 'คัดลอกแล้ว!' : 'คัดลอก JSON'}
        </Button>
      </div>

      <pre
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#0F172A',
          color: '#E2E8F0',
          fontSize: '12px',
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', monospace",
          overflowX: 'auto',
          maxHeight: '480px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        <code>{formattedJson}</code>
      </pre>
    </div>
  );
};
