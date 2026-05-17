import { useMemo } from 'react';
import { useAppShell } from './AppShellContext';
import { getPrefs } from './prefs';
import { appSurface, card, contentFrame, emptyStateCard, label, palette, primaryButton, secondaryButton, softCard, type } from './designSystem';
import { useZommyData } from './useZommyData';

const ZOMMY_DATA_OPTIONS = { includeEntries: true, includeLocal: false, entryLimit: 500 };

const COPY = {
  en: {
    title: 'Compare',
    subtitle: 'Time, held gently side by side.',
    emptyHeadline: 'Watch them change.',
    emptyBody: 'Pick two moments and place them side by side. Newborn and today. First steps and now. Same sofa, different month.',
    emptyCta: 'Create first comparison',
    suggested: 'Suggested for you',
    manual: 'Build your own',
    saved: 'Saved comparisons',
    noSaved: 'Saved then-and-now moments will live here.',
    then: 'Then',
    now: 'Now',
    firstLatest: 'First time / latest time',
    samePlace: 'Same place, different month',
    newborn: 'Newborn vs today',
    note: 'Add note',
    share: 'Share with family',
    save: 'Save to timeline',
    private: 'Only invited family members can see this',
    addMore: 'Add more memories to create richer comparisons.',
    loading: 'Loading…',
  },
  pt: {
    title: 'Comparar',
    subtitle: 'O tempo, lado a lado com calma.',
    emptyHeadline: 'Vê como mudam.',
    emptyBody: 'Escolhe dois momentos e coloca-os lado a lado. Recém-nascido e hoje. Primeiros passos e agora. O mesmo sofá, outro mês.',
    emptyCta: 'Criar primeira comparação',
    suggested: 'Sugestões para ti',
    manual: 'Criar comparação',
    saved: 'Comparações guardadas',
    noSaved: 'Os momentos antes-e-agora guardados vão viver aqui.',
    then: 'Antes',
    now: 'Agora',
    firstLatest: 'Primeira vez / última vez',
    samePlace: 'Mesmo lugar, outro mês',
    newborn: 'Recém-nascido e hoje',
    note: 'Adicionar nota',
    share: 'Partilhar com família',
    save: 'Guardar na timeline',
    private: 'Só familiares convidados podem ver isto',
    addMore: 'Adiciona mais memórias para criar comparações mais ricas.',
    loading: 'A carregar…',
  },
};

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const ageAt = (birthdate, date, lang) => {
  if (!birthdate || !date) return '';
  const days = Math.max(0, Math.floor((new Date(`${date}T12:00:00`) - new Date(`${birthdate}T12:00:00`)) / 86400000));
  if (days < 31) return lang === 'pt' ? `${days} dias` : `${days} days`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return lang === 'pt' ? `${months} meses` : `${months} months`;
  const years = Math.floor(months / 12);
  return lang === 'pt' ? `${years} anos` : `${years} years`;
};

export default function CompareScreen() {
  const { activeProfileId } = useAppShell();
  const { user, profiles, entries, loading } = useZommyData(ZOMMY_DATA_OPTIONS);
  const prefs = getPrefs();
  const lang = prefs.lang === 'pt' ? 'pt' : 'en';
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);

  if (!user) return null;

  const profile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
  const profileEntries = profile ? entries.filter((entry) => entry.profile_id === profile.id) : [];
  const latest = profileEntries[0];
  const earliest = profileEntries[profileEntries.length - 1];
  const second = profileEntries.find((entry) => entry.id !== latest?.id);
  const tone = profile?.color || palette.accent;
  const openComposer = () => window.dispatchEvent(new CustomEvent('zommy:open-memory-composer', { detail: { profileId: profile?.id || '', restoreDraft: false } }));

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame(124)}>
        <header style={headerStyle}>
          <div style={{ ...label, color: tone }}>{profile?.name || copy.title}</div>
          <h1 style={titleStyle}>{copy.title}</h1>
          <p style={mutedTextStyle}>{copy.subtitle}</p>
          <div style={privacyPillStyle}>{copy.private}</div>
        </header>
        {!profile || profileEntries.length < 2 ? <EmptyCompare copy={copy} openComposer={openComposer} tone={tone} /> : <SuggestedComparisons copy={copy} profile={profile} earliest={earliest} latest={latest} second={second} lang={lang} openComposer={openComposer} tone={tone} />}
        {loading && <div style={loadingStyle}>{copy.loading}</div>}
      </div>
    </main>
  );
}

function EmptyCompare({ copy, openComposer, tone }) {
  return (
    <>
      <section style={emptyStateCard}>
        <h2 style={emptyTitleStyle}>{copy.emptyHeadline}</h2>
        <p style={mutedTextStyle}>{copy.emptyBody}</p>
        <button className="b" onClick={openComposer} style={{ ...primaryButton(tone), justifySelf: 'center' }}>{copy.emptyCta}</button>
      </section>
      <section style={{ display: 'grid', gap: 10 }}>
        <PreviewCard title="Then / Now" />
        <PreviewCard title={copy.firstLatest} tone={palette.success} />
        <PreviewCard title={copy.samePlace} tone={palette.warning} />
      </section>
    </>
  );
}

function SuggestedComparisons({ copy, profile, earliest, latest, second, lang, openComposer, tone }) {
  return (
    <>
      <section style={{ display: 'grid', gap: 10 }}>
        <div style={{ ...label, color: palette.accent }}>{copy.suggested}</div>
        <CompareCard title={copy.newborn} left={earliest} right={latest} profile={profile} lang={lang} copy={copy} />
        {second && <CompareCard title={copy.firstLatest} left={second} right={latest} profile={profile} lang={lang} copy={copy} />}
      </section>
      <section style={{ ...softCard({ display: 'grid', gap: 10 }) }}>
        <div style={{ ...label, color: tone }}>{copy.manual}</div>
        <p style={mutedTextStyle}>{copy.addMore}</p>
        <button className="b" onClick={openComposer} style={{ ...secondaryButton(tone), justifySelf: 'start' }}>{copy.emptyCta}</button>
      </section>
      <section style={{ ...softCard({ display: 'grid', gap: 8 }) }}>
        <div style={{ ...label, color: palette.inkHint }}>{copy.saved}</div>
        <p style={mutedTextStyle}>{copy.noSaved}</p>
      </section>
    </>
  );
}

function CompareCard({ title, left, right, profile, lang, copy }) {
  return (
    <article className="zommy-elevated-card" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: 15, display: 'grid', gap: 12 }}>
        <h2 style={cardTitleStyle}>{title}</h2>
        <div style={tilesStyle}>
          <MomentTile label={copy.then} entry={left} profile={profile} lang={lang} />
          <MomentTile label={copy.now} entry={right} profile={profile} lang={lang} />
        </div>
        <p style={mutedTextStyle}>{formatDate(left.date, lang)} → {formatDate(right.date, lang)}</p>
        <div style={actionsStyle}>
          <button className="b" style={secondaryButton(palette.accent)}>{copy.save}</button>
          <button className="b" style={secondaryButton(profile.color || palette.success)}>{copy.share}</button>
          <button className="b" style={secondaryButton(palette.warning)}>{copy.note}</button>
        </div>
      </div>
    </article>
  );
}

function MomentTile({ label: tileLabel, entry, profile, lang }) {
  return (
    <div style={momentTileStyle}>
      <div style={tileImageWrapStyle}>
        {entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} ${tileLabel.toLowerCase()} memory`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: entry.cover_position || '50% 50%' }} /> : <div style={tileFallbackStyle}>{profile.emoji || '○'}</div>}
      </div>
      <div style={tileBodyStyle}>
        <div style={{ ...label, color: profile.color || palette.accent, fontSize: 10 }}>{tileLabel}</div>
        <div style={tileDateStyle}>{formatDate(entry.date, lang)}</div>
        <div style={tileAgeStyle}>{ageAt(profile.birthdate, entry.date, lang)}</div>
      </div>
    </div>
  );
}

function PreviewCard({ title, tone = palette.accent }) {
  return (
    <article style={{ ...softCard({ background: palette.surface }), display: 'grid', gap: 10 }}>
      <h3 style={previewTitleStyle}>{title}</h3>
      <div style={tilesStyle}>
        <div style={{ height: 116, borderRadius: 20, background: `${tone}1f` }} />
        <div style={{ height: 116, borderRadius: 20, background: palette.surfaceAlt }} />
      </div>
    </article>
  );
}

const headerStyle = { ...softCard({ borderColor: 'rgba(201,106,58,0.18)', background: 'rgba(255,255,255,.88)' }) };
const titleStyle = { fontFamily: type.serif, fontSize: 34, lineHeight: 1.06, fontWeight: type.weight.heading, marginTop: 5 };
const mutedTextStyle = { color: palette.inkSub, lineHeight: 1.55, fontSize: 14 };
const privacyPillStyle = { display: 'inline-flex', marginTop: 12, border: `1px solid ${palette.border}`, borderRadius: 999, padding: '7px 10px', color: palette.inkSub, fontSize: 12, fontWeight: type.weight.ui };
const loadingStyle = { color: palette.inkHint, textAlign: 'center', padding: 12 };
const emptyTitleStyle = { fontFamily: type.serif, fontSize: 29, lineHeight: 1.1 };
const cardTitleStyle = { fontFamily: type.serif, fontSize: 25, lineHeight: 1.12, fontWeight: type.weight.heading };
const tilesStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const momentTileStyle = { border: `1px solid ${palette.border}`, borderRadius: 22, overflow: 'hidden', background: palette.surfaceAlt };
const tileImageWrapStyle = { aspectRatio: '1 / 1.15' };
const tileFallbackStyle = { width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 32 };
const tileBodyStyle = { padding: 10, display: 'grid', gap: 3 };
const tileDateStyle = { color: palette.ink, fontSize: 12, fontWeight: type.weight.ui };
const tileAgeStyle = { color: palette.inkSub, fontSize: 11 };
const previewTitleStyle = { fontFamily: type.serif, fontSize: 23, fontWeight: type.weight.heading };
