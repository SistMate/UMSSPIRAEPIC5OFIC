'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bookmark, BriefcaseBusiness, CircleAlert, FileText, Info, MapPin } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { boardStyles as styles } from '../components/jobs-styles';
import { useVacancyConsultationSession } from '../components/VacancyConsultationProvider';
import {
  getTechnicalVacancyRequirements,
  isVacancyAvailable,
  VacancyApiError,
  type TechnicalVacancyRequirement,
} from '../../../lib/api/vacantes';
import { loadHu8Vacancy } from '../../../lib/vacancies/consultation-source';
import { hu8Href, resolveHu8DemoScenario, type Hu8DemoScenario } from '../../../lib/vacancies/demo-mode';
import type { Hu8VacancyDetail } from '../../../lib/vacancies/detail-content';
import { vacancyPublicationDate } from '../../../lib/vacancies/listing';
import { NO_TECHNICAL_REQUIREMENTS, uniqueVacancyRequirements } from '../../../lib/vacancies/requirements';
import './VacancyDetail.css';

type Props = { id: string };

export default function DetalleVacanteCliente({ id }: Props) {
  const searchParams = useSearchParams();
  const scenario = resolveHu8DemoScenario(searchParams.get('hu8Demo'));
  const [attempt, setAttempt] = useState(0);
  // Changing vacancy or retrying starts with empty state before effects run.
  return <DetalleVacanteContenido key={`${id}:${scenario ?? 'real'}:${attempt}`} id={id} scenario={scenario} onRetry={() => setAttempt((current) => current + 1)} />;
}

function DetailCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="hu8-detail-card"><h2>{icon}{title}</h2>{children}</section>;
}

function DetailLoading() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">Cargando detalle de la vacante...</p>
      <div className="hu8-detail-hero hu8-detail-loading-hero" aria-hidden="true">
        <div className={styles.skeleton} style={{ width: '25%' }} />
        <div className={styles.skeleton} style={{ width: '70%', height: 38, marginTop: 28 }} />
        <div className={styles.skeleton} style={{ width: '40%', marginTop: 24 }} />
        <div className={styles.skeleton} style={{ width: '55%', marginTop: 24 }} />
        <div className={styles.skeleton} style={{ height: 110, marginTop: 24 }} />
      </div>
      <div className="hu8-detail-grid" aria-hidden="true">
        <div className="hu8-detail-stack">
          {[1, 2, 3].map((item) => <div className="hu8-detail-card" key={item}>
            <div className={styles.skeleton} style={{ width: '35%' }} />
            {[1, 2, 3].map((line) => <div className={styles.skeleton} style={{ marginTop: 20 }} key={line} />)}
          </div>)}
        </div>
        <div className="hu8-detail-card"><div className={styles.skeleton} style={{ height: 320 }} /></div>
      </div>
    </div>
  );
}

function VacancyContent({
  vacancy,
  technicalRequirements,
}: {
  vacancy: Hu8VacancyDetail;
  technicalRequirements: TechnicalVacancyRequirement[] | null;
}) {
  const content = vacancy.detailContent;
  const requirements = uniqueVacancyRequirements(vacancy.requisitos);
  const available = isVacancyAvailable(vacancy.estado);
  const location = content?.locationDetail || vacancy.ubicacion;
  const publication = vacancyPublicationDate(vacancy.fechaCreacion);
  const closing = vacancyPublicationDate(content?.closingDate ?? null);
  const metadata = [vacancy.area, content?.experience, content?.schedule].filter(Boolean);
  const offerInfo = [
    { label: 'Ubicación', value: location },
    { label: 'Modalidad', value: vacancy.modalidad },
    { label: 'Área laboral', value: vacancy.area },
    { label: 'Experiencia', value: content?.experience },
    { label: 'Jornada', value: content?.schedule },
    { label: 'Publicación', value: publication.dateTime ? publication.label : undefined, dateTime: publication.dateTime },
    { label: 'Cierre de convocatoria', value: closing.dateTime ? closing.label : undefined, dateTime: closing.dateTime },
  ].filter((item) => item.value);

  return (
    <>
      <header className="hu8-detail-hero">
        <div className="hu8-detail-hero-top">
          <p className="hu8-detail-company">{vacancy.empresa}</p>
          <span className={`hu8-detail-status${available ? ' hu8-detail-status-open' : ''}`}>{available ? 'Abierta' : vacancy.estado}</span>
        </div>
        <h1>{vacancy.titulo}</h1>
        {(location || vacancy.modalidad) && <p className="hu8-detail-location"><MapPin size={20} aria-hidden="true" />{[location, vacancy.modalidad].filter(Boolean).join(' · ')}</p>}
        {metadata.length > 0 && <p className="hu8-detail-hero-meta">{metadata.join(' · ')}</p>}
        <div className="hu8-detail-panorama" aria-hidden="true" />
      </header>

      <div className="hu8-detail-grid">
        <div className="hu8-detail-stack">
          <DetailCard title="Acerca del puesto">
            {vacancy.descripcion ? <p>{vacancy.descripcion}</p> : <p className="hu8-detail-muted">La empresa no ha proporcionado una descripción del puesto.</p>}
            {content?.about?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {content?.experienceNote && <p className="hu8-detail-muted">{content.experienceNote}</p>}
          </DetailCard>

          {!!content?.responsibilities?.length && <DetailCard title="Responsabilidades" icon={<BriefcaseBusiness size={18} aria-hidden="true" />}>
            <ul className="hu8-detail-bullets">{content.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
          </DetailCard>}

          <section className="hu8-detail-card" aria-labelledby="technical-requirements-heading">
            <h2 id="technical-requirements-heading"><FileText size={18} aria-hidden="true" />Competencias requeridas</h2>
            {technicalRequirements !== null ? (
  technicalRequirements.length > 0 ? (
    <ul className="hu8-detail-bullets hu8-detail-requirements">
      {technicalRequirements.map((requirement) => (
        <li key={requirement.id}>
          <strong>{requirement.competencia}</strong>
          <span> — Nivel: {requirement.nivel}</span>
          <span> — Tipo: {requirement.tipo}</span>
          {requirement.descripcion && (
            <p>{requirement.descripcion}</p>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p>{NO_TECHNICAL_REQUIREMENTS}</p>
  )
) : requirements.length > 0 ? (
  <ul className="hu8-detail-bullets hu8-detail-requirements">
    {requirements.map((requirement) => (
      <li key={requirement.id}>{requirement.nombre}</li>
    ))}
  </ul>
) : (
  <p>{NO_TECHNICAL_REQUIREMENTS}</p>
)}
            {content?.desirable && <div className="hu8-detail-desirable">
              <h3>Competencia deseable</h3>
              <p>{content.desirable}</p>
            </div>}
          </section>

          {!!content?.benefits?.length ? <DetailCard title="Lo que ofrecemos">
            <ul className="hu8-detail-bullets">{content.benefits.map((item) => <li key={item}>{item}</li>)}</ul>
          </DetailCard> : vacancy.condiciones && <DetailCard title="Condiciones de la oferta"><p>{vacancy.condiciones}</p></DetailCard>}

          <DetailCard title={vacancy.empresa}>
            {content?.companyDescription ? <p>{content.companyDescription}</p> : <p className="hu8-detail-muted">No hay información adicional de la empresa disponible.</p>}
            {content?.companyFacts && <p className="hu8-detail-company-facts">{content.companyFacts}</p>}
            <button className="hu8-detail-company-link" type="button" disabled title="El perfil de empresa no está disponible">Ver perfil de empresa → <span className="sr-only">(no disponible)</span></button>
          </DetailCard>
        </div>

        <aside className="hu8-detail-sidebar" aria-label="Resumen de la oferta">
          <section className="hu8-detail-card">
            <h2>Información de la oferta</h2>
            <dl className="hu8-detail-facts">
              {offerInfo.map((item) => <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.dateTime ? <time dateTime={item.dateTime}>{item.value}</time> : item.value}</dd>
              </div>)}
            </dl>
            <div className="hu8-detail-actions">
              <button type="button" className="hu8-detail-apply" disabled aria-describedby="hu8-actions-unavailable">Postular a la oferta</button>
              <button type="button" className="hu8-detail-save" disabled aria-describedby="hu8-actions-unavailable"><Bookmark size={15} aria-hidden="true" />Guardar oferta</button>
              <p id="hu8-actions-unavailable">Postulación y guardado aún no disponibles.</p>
            </div>
          </section>
          <div className="hu8-detail-notice"><Info size={17} aria-hidden="true" /><p>{available
            ? 'Esta vacante está publicada y disponible para consulta. Revisa las condiciones antes de postular.'
            : 'Consulta el estado y las condiciones de esta oferta antes de postular.'}</p></div>
        </aside>
      </div>
    </>
  );
}

function DetalleVacanteContenido({ id, scenario, onRetry }: Props & { scenario: Hu8DemoScenario | null; onRetry: () => void }) {
  const session = useVacancyConsultationSession(scenario);
  const [vacancy, setVacancy] = useState<Hu8VacancyDetail | null>(null);
  const [technicalRequirements, setTechnicalRequirements] =
  useState<TechnicalVacancyRequirement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
Promise.all([
  loadHu8Vacancy(id, scenario, controller.signal, session.journey),
  scenario
    ? Promise.resolve(null)
    : getTechnicalVacancyRequirements(id, controller.signal),
])
  .then(([result, requisitos]) => {
    if (!controller.signal.aborted) {
      setVacancy(result);
      setTechnicalRequirements(requisitos);
    }
  })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setVacancy(null);
        const missing = requestError instanceof VacancyApiError && (requestError.status === 404 || requestError.status === 400);
        setNotFound(missing);
        setError(missing
          ? 'La vacante no existe o el enlace no es válido.'
          : 'No pudimos recuperar la información de la vacante. Inténtalo nuevamente.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, scenario, session]);

  return (
    <main className={`${styles.page} hu8-detail-page`}>
      <div className="hu8-detail-content">
        <Link href={hu8Href('/vacantes', scenario)} className={`${styles.back} hu8-detail-back`}><ArrowLeft size={16} aria-hidden="true" />Volver a vacantes</Link>
        {scenario && <span className="ml-2 text-xs text-[#71829a]">Datos simulados · Demostración</span>}
        {loading ? <DetailLoading /> : error || !vacancy ? (
          <section role={notFound ? 'status' : 'alert'} className={styles.state}>
            <CircleAlert size={36} strokeWidth={1.5} aria-hidden="true" className={styles.stateIcon} />
            <h1 className="text-xl font-semibold">{notFound ? 'Vacante no encontrada' : 'No se pudo cargar la vacante'}</h1>
            <p>{error || 'La vacante no existe.'}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {!notFound && <button type="button" onClick={onRetry} className={styles.button}>Reintentar</button>}
              <Link href={hu8Href('/vacantes', scenario)} className={styles.button}>Volver a vacantes</Link>
            </div>
          </section>
          ) : (
        <VacancyContent
    vacancy={vacancy}
    technicalRequirements={technicalRequirements}
  />
)}
      </div>
      <footer className="hu8-detail-footer"><div><span>UMSSPIRA · Universidad Mayor de San Simón</span><span>Ayuda y soporte</span></div></footer>
    </main>
  );
}
