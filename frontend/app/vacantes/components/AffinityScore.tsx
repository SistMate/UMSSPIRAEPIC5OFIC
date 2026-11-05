type Props = {
  percentage: number | null;
  matched: number;
  total: number;
  emptyMessage?: string;
  compact?: boolean;
};

export function AffinityScore({
  percentage,
  matched,
  total,
  emptyMessage = 'Completa tus habilidades para consultar el porcentaje.',
  compact = false,
}: Props) {
  return (
    <div className={compact ? 'min-w-[112px]' : 'rounded-lg bg-white p-5'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {!compact && (
            <h2 className="text-sm font-bold text-[#142237]">Afinidad</h2>
          )}
          {compact && percentage === null ? (
            <span className="inline-flex rounded-full border border-[#d9d0c3] bg-[#f3efe5] px-2.5 py-1 text-[10px] font-semibold text-[#617184]">
              Sin calcular
            </span>
          ) : (
            <p
              className={`font-bold text-[#ad5239] ${
                compact ? 'text-2xl' : 'mt-2 text-4xl'
              }`}
            >
              {percentage === null ? '—' : `${percentage} %`}
            </p>
          )}
        </div>
      </div>
      {percentage === null && emptyMessage ? (
        <p className="mt-2 text-xs leading-5 text-[#617184]">{emptyMessage}</p>
      ) : percentage !== null ? (
        <>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7dfd3]"
            role="progressbar"
            aria-label="Porcentaje de afinidad"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <div
              className="h-full rounded-full bg-[#ffad5c]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#617184]">
            {matched} de {total} requisitos con al menos una palabra coincidente.
          </p>
        </>
      ) : null}
      {!compact && (
        <p className="mt-3 text-[11px] leading-4 text-[#617184]">
          El porcentaje compara tus habilidades guardadas con los requisitos
          de esta vacante.
        </p>
      )}
    </div>
  );
}
