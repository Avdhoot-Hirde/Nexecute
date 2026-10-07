import Editor from '@monaco-editor/react';
import { useEditor } from '../context/EditorContext';
import { IDE_LANGUAGES } from '../Store/IdeStore';

export default function CodeEditor() {
  const {
    code,
    setCode,
    language,
    setLanguage,
    input,
    setInput,
    output,
    status,
    run,
  } = useEditor();
  const snippet = Object.fromEntries(IDE_LANGUAGES.map(item => [item.value, item.snippet]));
  return (
    <div className="w-[min(36rem,calc(100vw-3rem))] max-w-xl bg-[#070914] border border-violet-300/15 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black">
        <select
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value)
            setCode(snippet[event.target.value])
          }}
          className="bg-black text-sm p-3 text-gray-300 focus:outline-none rounded-xl"
        >
          {IDE_LANGUAGES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>

        <button
          onClick={run}
          disabled={status === 'running'}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-md"
        >
          {status === 'running' ? 'Running...' : 'Run'}
        </button>
      </div>

      <Editor
        key={language}
        height="70vh"
        width="100%"
        language={language}
        value={code}
        onChange={(value) => setCode(value ?? '')}
        theme="hc-black"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          padding: { top: 12 },
        }}
      />

      <div className="grid grid-cols-2 border-t border-white/10 bg-black h-36">
        <div className="flex flex-col border-r border-white/10 px-4 py-3">
          <label htmlFor="code-input" className="text-xs text-gray-500 mb-2">
            Input (stdin)
          </label>
          <textarea
            id="code-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={status === 'running'}
            placeholder={'Enter input here...\nOne value per line'}
            spellCheck="false"
            className="min-h-0 flex-1 resize-none bg-transparent text-sm text-gray-300 font-mono outline-none placeholder:text-gray-700 disabled:opacity-60"
          />
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'running'
                  ? 'bg-yellow-400 animate-pulse'
                  : status === 'done'
                  ? 'bg-green-500'
                  : status === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-600'
              }`}
            />
            {status === 'idle' && 'Output'}
            {status === 'running' && 'Running...'}
            {status === 'done' && 'Process exited normally'}
            {status === 'error' && 'Execution failed'}
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
            {output || 'Output will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
