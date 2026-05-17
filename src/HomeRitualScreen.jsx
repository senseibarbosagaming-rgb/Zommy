import { useMemo } from 'react';
import { useAppShell } from './AppShellContext';
import { monthBounds } from './capsuleCore';
import { getPrefs } from './prefs';
import { appSurface, card, contentFrame, emptyStateCard, label, palette, primaryButton, secondaryButton, softCard, type } from './designSystem';
import { useZommyData } from './useZommyData';

const ZOMMY_DATA_OPTIONS = { includeEntries: true, includeLocal: true, entryLimit: 160 };

const COPY = {
  en: {
    today: 'Today',
    private: 'Private to your family',
    prompt: 'What is one tiny thing you do not want to forget today?',
    addMoment: 'Add photo or note',
    latest: 'Latest saved memory',
    returnTitle: 'Worth coming back to',
    fromThisDay: 'From this day',
    favorite: 'Worth keeping',
    compare: 'Suggested comparison',
    compareBody: 'Place the earliest and latest moments side by side and feel the time between them.',
    compareCta: 'Compare then and now',
    chapterTitle: (month) => `${month} chapter`,
    chapterBody: (count, name) => count > 0 ? `${count} ${count === 1 ? 'moment' : 'moments'} can become ${name}'s month story.` : `A few small memories will turn ${name}'s month into a story.`,
    chapterCta: 'Open month story',
    emptyHeadline: 'Start with today.',
    emptyBody: 'One photo. One sentence. That is enough.',
    emptyCta: 'Add first memory',
    draftTitle: 'Finish the almost-memory',
    draftBody: 'You started saving something. Finish it before the details fade.',
    draftCta: 'Continue',
    queuedTitle: 'Waiting for connection',
    queuedBody: (count) => `${count} offline ${count === 1 ? 'memory' : 'memories'} will upload when connection returns.`,
    monthlyStory: 'Monthly story',
    loading: 'Loading…',
  },
  pt: {
    today: 'Hoje',
    private: 'Privado para a tua família',
    prompt: 'Qual é uma coisa pequenina que não queres esquecer hoje?',
    addMoment: 'Adicionar foto ou nota',
    latest: 'Última memória guardada',
    returnTitle: 'Para voltar mais tarde',
    fromThisDay: 'Deste dia',
    favorite: 'Vale a pena guardar',
    compare: 'Comparação sugerida',
    compareBody: 'Coloca o primeiro e o último momento lado a lado e sente o tempo entre eles.',
    compareCta: 'Comparar antes e agora',
    chapterTitle: (month) => `Capítulo de ${month}`,
    chapterBody: (count, name) => count > 0 ? `${count} ${count === 1 ? 'momento' : 'momentos'} podem tornar-se na história do mês de ${name}.` : `Algumas memórias pequenas vão transformar o mês de ${name} numa história.`,
    chapterCta: 'Abrir história do mês',
    emptyHeadline: 'Começa por hoje.',
    emptyBody: 'Uma foto. Uma frase. É suficiente.',
    emptyCta: 'Adicionar primeira memória',
    draftTitle: 'Termina a quase-memória',
    draftBody: 'Começaste a guardar algo. Termina antes que os detalhes desapareçam.',
    draftCta: 'Continuar',
    queuedTitle: 'À espera de ligação',
    queuedBody: (count) => `${count} ${count === 1 ? 'memória offline' : 'memórias offline'} vai carregar quando a ligação voltar.`,
    monthlyStory: 'História mensal',
    loading: 'A carregar…',
  },
};

const todayIso = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const monthName = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { month: 'long' });
const diffDays = (from, to) => Math.floor((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);
const yearsBetween = (from, to) => parseInt(to.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);

const childAge = (birthdate, lang) => {
  if (!birthdate) return '';
  const days = Math.max(0, diffDays(birthdate, todayIso()));
  const totalMonths = Math.floor(days / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (lang === 'pt') return years <= 0 ? `${Math.max(0, totalMonths)} mes${totalMonths === 1 ? '' : 'es'}` : `${years} ano${years === 1 ? '' : 's'}${months ? ` e ${months} mes${months === 1 ? '' : 'es'}` : ''}`;
  return years <= 0 ? `${Math.max(0, totalMonths)} month${totalMonths === 1 ? '' : 's'}` : `${years} year${years === 1 ? '' : 's'}${months ? `, ${months} month${months === 1 ? '' : 's'}` : ''}`;
};

export default function HomeRitualScreen() {
  const { activeProfileId, openPrimaryScreen } = useAppShell();
  const { user, profiles, entries, draft, queuedCount, loading } = useZommyData(ZOMMY_DATA_OPTIONS);
  const prefs = getPrefs();
  const lang = prefs.lang === 'pt' ? 'pt' : 'en';
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);
  const profile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
  const period = monthBounds();
  const today = todayIso();

  if (!user || !profile) return null;

  const tone = profile.color || palette.accent;
  const childEntries = entries.filter((entry) => entry.profile_id === profile.id);
  const monthEntries = childEntries.filter((entry) => entry.date >= period.start && entry.date <= period.end);
  const latest = childEntries[0];
  const favorite = childEntries.find((entry) => entry.favorite);
  const anniversary = childEntries.find((entry) => sameMonthDay(entry.date, today) && yearsBetween(entry.date, today) > 0);
  const returnEntry = anniversary || favorite || childEntries[1] || latest;
  const earliest = childEntries[childEntries.length - 1];
  const openComposer = () => window.dispatchEvent(new CustomEvent('zommy:open-memory-composer', { detail: { profileId: profile.id, restoreDraft: false } }));
  const openDraft = () => window.dispatchEvent(new CustomEvent('zommy:open-memory-composer', { detail: { restoreDraft: true } }));
  const openChapter = () => window.dispatchEvent(new CustomEvent('zommy:show-chapter', { detail: { profileId: profile.id } }));

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame()}>
        <ProfileHeader profile={profile} tone={tone} copy={copy} lang={lang} />
        {(draft || queuedCount > 0) && (
          <section style={{ display: 'grid', gap: 10 }}>
            {draft && <StatusCard title={copy.draftTitle} body={copy.draftBody} cta={copy.draftCta} onClick={openDraft} tone={palette.warning} />}
            {queuedCount > 0 && <StatusCard title={copy.queuedTitle} body={copy.queuedBody(queuedCount)} tone={palette.success} />}
          </section>
        )}
        <DailyPrompt copy={copy} onClick={openComposer} />
        {!childEntries.length && <EmptyStart copy={copy} onClick={openComposer} />}
        {latest && <MemoryFeature title={copy.latest} entry={latest} profile={profile} lang={lang} />}
        {returnEntry && <MemoryFeature title={anniversary ? copy.fromThisDay : favorite ? copy.favorite : copy.returnTitle} entry={returnEntry} profile={profile} lang={lang} quiet />}
        {childEntries.length >= 2 && earliest?.id !== latest?.id && <CompareTeaser copy={copy} profile={profile} earliest={earliest} latest={latest} onClick={() => openPrimaryScreen('compare', { profileId: profile.id })} />}
        <MonthlyStory copy={copy} profile={profile} tone={tone} period={period} monthEntries={monthEntries} lang={lang} onClick={openChapter} />
        {loading && <div style={{ ...card, height: 180, background: palette.surface }} aria-hidden="true" />}
      </div>
    </main>
  );
}

function ProfileHeader({ profile, tone, copy, lang }) {
  return (
    <header style={profileHeaderStyle}>
      <div>
        <div style={{ ...label, color: tone }}>{copy.today}</div>
        <h1 style={profileTitleStyle}>{profile.name}</h1>
        <p style={profileAgeStyle}>{childAge(profile.birthdate, lang)}</p>
      </div>
      <div style={{ ...profileAvatarStyle, background: profile.bg || palette.accentLight, color: tone }}>{profile.emoji || '○'}</div>
      <div style={privatePillStyle}>{copy.private}</div>
    </header>
  );
}

function DailyPrompt({ copy, onClick }) {
  return (
    <section style={dailyPromptStyle}>
      <h2 style={promptTextStyle}>{copy.prompt}</h2>
      <button className="b" onClick={onClick} style={addButtonStyle}>{copy.addMoment}</button>
    </section>
  );
}

function EmptyStart({ copy, onClick }) {
  return (
    <section style={emptyStateCard}>
      <h2 style={emptyTitleStyle}>{copy.emptyHeadline}</h2>
      <p style={mutedTextStyle}>{copy.emptyBody}</p>
      <button className="b" onClick={onClick} style={{ ...primaryButton(), justifySelf: 'center' }}>{copy.emptyCta}</button>
    </section>
  );
}

function MemoryFeature({ title, entry, profile, lang, quiet = false }) {
  return (
    <article className="zommy-elevated-card" style={{ ...card, overflow: 'hidden' }}>
      {entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} memory from ${entry.date}`} style={{ ...featureImageStyle, height: quiet ? 196 : 252, objectPosition: entry.cover_position || '50% 50%' }} /> : <div style={{ ...emptyPhotoStyle, height: quiet ? 156 : 190 }}>{profile.emoji || '📷'}</div>}
      <div style={{ ...featureBodyStyle, borderLeftColor: profile.color || palette.accent }}>
        <div style={featureLabelStyle}>{title}</div>
        <h2 style={featureDateStyle}>{formatDate(entry.date, lang)}</h2>
        {entry.note && <p style={mutedTextStyle}>{entry.note}</p>}
      </div>
    </article>
  );
}

function CompareTeaser({ copy, profile, earliest, latest, onClick }) {
  return (
    <section style={{ ...softCard({ display: 'grid', gap: 12 }) }}>
      <div style={label}>{copy.compare}</div>
      <div style={comparePhotosStyle}>
        <MiniPhoto entry={earliest} profile={profile} />
        <MiniPhoto entry={latest} profile={profile} />
      </div>
      <p style={mutedTextStyle}>{copy.compareBody}</p>
      <button className="b" onClick={onClick} style={{ ...secondaryButton(palette.accent), justifySelf: 'start' }}>{copy.compareCta}</button>
    </section>
  );
}

function MiniPhoto({ entry, profile }) {
  return <div style={miniPhotoStyle}>{entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} memory`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: entry.cover_position || '50% 50%' }} /> : <div style={miniPhotoFallbackStyle}>{profile.emoji || '○'}</div>}</div>;
}

function MonthlyStory({ copy, profile, tone, period, monthEntries, lang, onClick }) {
  return (
    <section className="zommy-elevated-card" style={monthlyStoryStyle}>
      <div style={{ ...label, color: tone }}>{copy.monthlyStory}</div>
      <h2 style={monthlyTitleStyle}>{copy.chapterTitle(monthName(period.start, lang))}</h2>
      <p style={mutedTextStyle}>{copy.chapterBody(monthEntries.length, profile.name)}</p>
      <button className="b" onClick={onClick} style={{ ...secondaryButton(tone), justifySelf: 'start' }}>{copy.chapterCta}</button>
    </section>
  );
}

function StatusCard({ title, body, cta, onClick, tone }) {
  const content = <><div style={{ color: tone, fontSize: 13, fontWeight: type.weight.heading }}>{title}</div><p style={mutedTextStyle}>{body}</p>{cta && <div style={{ justifySelf: 'start', ...secondaryButton(tone), padding: '8px 11px', fontSize: 12 }}>{cta}</div>}</>;
  return onClick ? <button className="zommy-elevated-card" onClick={onClick} style={{ textAlign: 'left', ...softCard({ background: palette.surface, display: 'grid', gap: 7, cursor: 'pointer' }) }}>{content}</button> : <article className="zommy-elevated-card" style={{ ...softCard({ background: palette.surface, display: 'grid', gap: 7 }) }}>{content}</article>;
}

const profileHeaderStyle = { ...card, padding: 20, borderRadius: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' };
const profileTitleStyle = { fontFamily: type.serif, fontSize: 32, lineHeight: 1.08, fontWeight: type.weight.heading, marginTop: 5 };
const profileAgeStyle = { color: palette.inkSub, marginTop: 6, fontSize: 13 };
const profileAvatarStyle = { width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', fontSize: 30 };
const privatePillStyle = { gridColumn: '1 / -1', justifySelf: 'start', background: palette.bg, border: `1px solid ${palette.border}`, color: palette.inkSub, fontSize: 12, fontWeight: type.weight.ui, padding: '5px 12px', borderRadius: 9999 };
const dailyPromptStyle = { ...card, padding: 20, display: 'grid', gap: 16 };
const promptTextStyle = { fontFamily: type.sans, fontSize: 17, fontWeight: type.weight.ui, lineHeight: 1.45 };
const addButtonStyle = { width: '100%', height: 48, border: 'none', background: palette.accent, color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: type.weight.ui, cursor: 'pointer' };
const featureImageStyle = { width: '100%', objectFit: 'cover', display: 'block' };
const emptyPhotoStyle = { display: 'grid', placeItems: 'center', color: palette.inkHint, fontSize: 42, background: palette.surfaceAlt };
const featureBodyStyle = { padding: 16, display: 'grid', gap: 8, borderLeft: '3px solid' };
const featureLabelStyle = { color: palette.inkSub, fontSize: 11, fontWeight: type.weight.ui, textTransform: 'uppercase', letterSpacing: '0.06em' };
const featureDateStyle = { fontFamily: type.serif, fontSize: 23, lineHeight: 1.2, fontWeight: type.weight.heading };
const mutedTextStyle = { color: palette.inkSub, lineHeight: 1.6, fontSize: 14 };
const comparePhotosStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const miniPhotoStyle = { borderRadius: 14, overflow: 'hidden', aspectRatio: '1 / 1', background: palette.surfaceAlt };
const miniPhotoFallbackStyle = { width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 28 };
const monthlyStoryStyle = { ...card, padding: 18, background: '#FDF6EF', border: '1px solid rgba(201,106,58,0.15)', display: 'grid', gap: 12 };
const monthlyTitleStyle = { fontFamily: type.serif, fontSize: 27, lineHeight: 1.08, fontWeight: type.weight.heading };
const emptyTitleStyle = { fontFamily: type.serif, fontSize: 27, lineHeight: 1.12 };
