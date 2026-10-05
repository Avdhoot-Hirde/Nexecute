import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

export function CustomSelect({
  value,
  onChange,
  options = [],
  className = "",
  ariaLabel = "Select an option",
}) {
  const selectedOption = options.find((option) =>
    typeof option === "string" ? option === value : option.value === value,
  );
  const selectedLabel =
    typeof selectedOption === "string" ? selectedOption : selectedOption?.label;

  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton
        aria-label={ariaLabel}
        className={`group flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-violet-400/15 bg-gradient-to-r from-violet-500/10 to-cyan-500/[0.04] px-3.5 py-2 text-left text-sm font-semibold text-slate-100 shadow-inner shadow-white/[0.025] outline-none transition hover:border-violet-400/35 hover:from-violet-500/15 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10 ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 shadow-[0_0_9px_rgba(139,92,246,0.7)]" />
          <span className="truncate">{selectedLabel || value || "Select an option"}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-slate-400 transition group-data-[open]:rotate-180"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </ListboxButton>
      <ListboxOptions
        anchor={{ to: "bottom start", gap: 6 }}
        className="z-[100] w-[var(--button-width)] overflow-hidden rounded-xl border border-violet-400/15 bg-[#0d1020]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl outline-none"
      >
        {options.map((option) => {
          const optionValue =
            typeof option === "string" ? option : option.value;
          const optionLabel =
            typeof option === "string" ? option : option.label;

          return (
            <ListboxOption
              key={optionValue}
              value={optionValue}
              className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none data-[focus]:bg-violet-500/15 data-[focus]:text-white data-[selected]:text-violet-200"
            >
              <span>{optionLabel}</span>
              <span className="hidden text-violet-300 group-data-[selected]:block" aria-hidden="true">✓</span>
            </ListboxOption>
          );
        })}
      </ListboxOptions>
    </Listbox>
  );
}
