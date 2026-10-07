import { useState } from 'react';
import { EditorContext } from './EditorContext';
import { IDE_LANGUAGES } from '../Store/IdeStore';
import { authFetch } from '../Store/AuthStore';

export function EditorProvider({ children }) {
  const [code, setCode] = useState("print('Hello World!!')");
  const [language, setLanguage] = useState('python');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('idle');

  async function run() {
    setStatus('running');
    setOutput('');

    try {
      const response = await authFetch('/api/trial/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, stdin: input, file: IDE_LANGUAGES.find(item => item.value === language)?.file }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.stderr || data.error || 'Execution failed');
      }

      setOutput(data.stdout || data.stderr || '');
      setStatus('done');
    } catch (error) {
      setOutput(error.message || 'Execution failed');
      setStatus('error');
    }
  }

  return (
    <EditorContext.Provider
      value={{
        code,
        setCode,
        language,
        setLanguage,
        input,
        setInput,
        output,
        status,
        run,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
