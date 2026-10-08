import { useCallback } from 'react';

interface BigKeypadProps {
  value: string;
  onChange: (val: string) => void;
  allowDecimal?: boolean;
}

export function BigKeypad({ value, onChange, allowDecimal = true }: BigKeypadProps) {
  const onKeyPress = useCallback((key: string) => {
    if (key === 'C') {
      onChange('');
    } else if (key === 'DEL') {
      onChange(value.slice(0, -1));
    } else if (key === '.') {
      if (allowDecimal && !value.includes('.')) {
        onChange(value === '' ? '0.' : value + '.');
      }
    } else if (key === '+0.1') {
      const num = parseFloat(value || '0');
      onChange((num + 0.1).toFixed(1));
    } else if (key === '-0.1') {
      const num = parseFloat(value || '0');
      if (num >= 0.1) onChange((num - 0.1).toFixed(1));
    } else {
      // number
      if (value === '0') {
        onChange(key);
      } else {
        onChange(value + key);
      }
    }
  }, [value, onChange, allowDecimal]);

  const btnClass = "h-16 text-3xl font-bold bg-surface border-2 border-line rounded-xl active:bg-primary active:text-on-primary transition-colors touch-manipulation";

  return (
    <div className="grid grid-cols-4 gap-2 mt-4 bg-paper p-4 rounded-xl border border-line shadow-sm">
      {/* Kolom Angka (3 kolom) & Opsional Stepper di kanan */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button key={n} type="button" onClick={() => onKeyPress(n)} className={btnClass}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => onKeyPress('.')} className={btnClass}>
          .
        </button>
        <button type="button" onClick={() => onKeyPress('0')} className={btnClass}>
          0
        </button>
        <button type="button" onClick={() => onKeyPress('DEL')} className="h-16 text-2xl font-bold bg-warn-soft text-warn-ink border-2 border-warn rounded-xl active:bg-warn active:text-white touch-manipulation">
          ⌫
        </button>
      </div>
      
      <div className="col-span-1 flex flex-col gap-2">
        <button type="button" onClick={() => onKeyPress('C')} className="h-16 text-xl font-bold bg-danger-soft text-danger-ink border-2 border-danger rounded-xl active:bg-danger active:text-white touch-manipulation">
          C
        </button>
        <button type="button" onClick={() => onKeyPress('+0.1')} className="h-[4.5rem] text-xl font-bold bg-ok-soft text-ok-ink border-2 border-ok rounded-xl active:bg-ok active:text-white touch-manipulation">
          +0.1
        </button>
        <button type="button" onClick={() => onKeyPress('-0.1')} className="h-[4.5rem] text-xl font-bold bg-ok-soft text-ok-ink border-2 border-ok rounded-xl active:bg-ok active:text-white touch-manipulation">
          -0.1
        </button>
      </div>
    </div>
  );
}
