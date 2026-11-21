/**
 * Every official source cited on the site, in one place.
 *
 * Each source lists the language versions that the publisher itself
 * provides. Pages link to the reader's language when it exists, otherwise to
 * another version, labelled with its language.
 *
 * `published` is the date shown by the publisher (publication or last
 * update). `checked` is when we last opened the page and confirmed it still
 * says what we cite it for.
 */
import type { Locale } from '../i18n/locales';

export type PublisherId = 'who' | 'whoAfro' | 'cdc' | 'drcMoh' | 'africaCdc';

export interface SourceVersion {
  title: string;
  url: string;
}

export interface Source {
  publisher: PublisherId;
  versions: Partial<Record<Locale, SourceVersion>>;
  published: string;
  checked: string;
}

const WHO_FACT_SHEET = 'https://www.who.int/{lang}news-room/fact-sheets/detail/ebola-disease';
const whoFactSheet = (locale: Locale) =>
  WHO_FACT_SHEET.replace('{lang}', locale === 'en' ? '' : `${locale}/`);

export const SOURCES = {
  whoFactSheet: {
    publisher: 'who',
    versions: {
      en: { title: 'Ebola disease (fact sheet)', url: whoFactSheet('en') },
      ar: { title: 'مرض الإيبولا (صحيفة وقائع)', url: whoFactSheet('ar') },
      zh: { title: '埃博拉病（情况介绍）', url: whoFactSheet('zh') },
      fr: { title: 'Maladie d’Ebola (principaux repères)', url: whoFactSheet('fr') },
      ru: { title: 'Болезнь, вызванная вирусом Эбола (информационный бюллетень)', url: whoFactSheet('ru') },
      es: { title: 'Enfermedad por el virus del Ébola (nota descriptiva)', url: whoFactSheet('es') },
    },
    published: '2025-04-24',
    checked: '2026-11-19',
  },
  whoQuestions: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Ebola disease: questions and answers',
        url: 'https://www.who.int/news-room/questions-and-answers/item/ebola-virus-disease',
      },
    },
    published: '2025-12-11',
    checked: '2026-11-19',
  },
  whoDon619: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Disease Outbreak News: Ebola disease caused by Bundibugyo virus, Democratic Republic of the Congo',
        url: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON619',
      },
    },
    published: '2026-10-08',
    checked: '2026-11-19',
  },
  whoPheic: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Epidemic of Ebola Disease caused by Bundibugyo virus in the Democratic Republic of the Congo and Uganda determined a public health emergency of international concern',
        url: 'https://www.who.int/news/item/17-05-2026-epidemic-of-ebola-disease-in-the-democratic-republic-of-the-congo-and-uganda-determined-a-public-health-emergency-of-international-concern',
      },
      fr: {
        title: 'L’épidémie de maladie d’Ebola due au virus Bundibugyo en Ouganda et en République démocratique du Congo constitue une urgence de santé publique de portée internationale',
        url: 'https://www.who.int/fr/news/item/17-05-2026-epidemic-of-ebola-disease-in-the-democratic-republic-of-the-congo-and-uganda-determined-a-public-health-emergency-of-international-concern',
      },
      es: {
        title: 'La epidemia de la enfermedad del Ébola causada por el virus de Bundibugyo en la República Democrática del Congo y Uganda ha sido declarada emergencia de salud pública de importancia internacional',
        url: 'https://www.who.int/es/news/item/17-05-2026-epidemic-of-ebola-disease-in-the-democratic-republic-of-the-congo-and-uganda-determined-a-public-health-emergency-of-international-concern',
      },
      ru: {
        title: 'Эпидемия болезни, вызванной эболавирусом Бундибугио, в Демократической Республике Конго и Уганде признана чрезвычайной ситуацией в области здравоохранения, имеющей международное значение',
        url: 'https://www.who.int/ru/news/item/17-05-2026-epidemic-of-ebola-disease-in-the-democratic-republic-of-the-congo-and-uganda-determined-a-public-health-emergency-of-international-concern',
      },
      zh: {
        title: '刚果民主共和国和乌干达本迪布焦病毒引发的埃博拉病流行已确定为国际关注的突发公共卫生事件',
        url: 'https://www.who.int/zh/news/item/17-05-2026-epidemic-of-ebola-disease-in-the-democratic-republic-of-the-congo-and-uganda-determined-a-public-health-emergency-of-international-concern',
      },
    },
    published: '2026-05-17',
    checked: '2026-11-19',
  },
  whoTreatmentTrial: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Patient enrolment begins in a scientific trial to identify the first effective treatments for Bundibugyo virus disease',
        url: 'https://www.who.int/news/item/02-07-2026-patient-enrolment-begins-in-a-scientific-trial-to-identify-the-first-effective-treatments-for-bundibugyo-virus-disease',
      },
      fr: {
        title: 'Le processus d’inclusion des patients débute dans le cadre d’un essai scientifique visant à identifier les premiers traitements efficaces contre la maladie à virus Bundibugyo',
        url: 'https://www.who.int/fr/news/item/02-07-2026-patient-enrolment-begins-in-a-scientific-trial-to-identify-the-first-effective-treatments-for-bundibugyo-virus-disease',
      },
      es: {
        title: 'Se abre la inscripción de pacientes en un ensayo científico para determinar los primeros tratamientos eficaces contra la enfermedad por el virus de Bundibugyo',
        url: 'https://www.who.int/es/news/item/02-07-2026-patient-enrolment-begins-in-a-scientific-trial-to-identify-the-first-effective-treatments-for-bundibugyo-virus-disease',
      },
      ru: {
        title: 'Открыт набор пациентов для участия в клиническом исследовании для определения первых эффективных методов лечения болезни, вызванной вирусом Бундибугио',
        url: 'https://www.who.int/ru/news/item/02-07-2026-patient-enrolment-begins-in-a-scientific-trial-to-identify-the-first-effective-treatments-for-bundibugyo-virus-disease',
      },
      zh: {
        title: '为确定本迪布焦病毒病有效疗法启动科学试验并开始招募患者',
        url: 'https://www.who.int/zh/news/item/02-07-2026-patient-enrolment-begins-in-a-scientific-trial-to-identify-the-first-effective-treatments-for-bundibugyo-virus-disease',
      },
    },
    published: '2026-07-02',
    checked: '2026-11-19',
  },
  whoVaccineAdvisoryGroup: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Third meeting of the WHO Technical Advisory Group on candidate vaccine prioritization (TAG-CVP) for Bundibugyo virus disease outbreak response: meeting report',
        url: 'https://www.who.int/publications/i/item/B09865',
      },
    },
    published: '2026-07-31',
    checked: '2026-11-19',
  },
  afroUgandaEnd: {
    publisher: 'whoAfro',
    versions: {
      en: {
        title: 'Uganda ends Ebola outbreak following completion of 42-day countdown',
        url: 'https://www.afro.who.int/countries/uganda/news/uganda-ends-ebola-outbreak-following-completion-42-day-countdown',
      },
    },
    published: '2026-08-27',
    checked: '2026-11-19',
  },
  afroNigeria: {
    publisher: 'whoAfro',
    versions: {
      en: {
        title: 'Nigeria confirms imported case of Ebola Bundibugyo virus disease',
        url: 'https://www.afro.who.int/countries/nigeria/news/nigeria-confirms-imported-case-ebola-bundibugyo-virus-disease',
      },
    },
    published: '2026-10-20',
    checked: '2026-11-19',
  },
  whoDon622: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Disease Outbreak News: Ebola disease caused by Bundibugyo virus, Democratic Republic of the Congo, Kenya and Nigeria',
        url: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622',
      },
    },
    published: '2026-10-23',
    checked: '2026-11-19',
  },
  whoVaccineTrials: {
    publisher: 'who',
    versions: {
      en: {
        title: 'Two new candidate vaccines to join Ebola trial as treatment research advances',
        url: 'https://www.who.int/news/item/04-11-2026-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
      fr: {
        title: 'Deux nouveaux vaccins candidats rejoignent l’essai sur la maladie d’Ebola dans un contexte de progrès de la recherche en matière de traitement',
        url: 'https://www.who.int/fr/news/item/04-11-2026-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
      es: {
        title: 'Un ensayo incorporará dos nuevas vacunas experimentales contra el ébola, mientras continúa la investigación sobre tratamientos',
        url: 'https://www.who.int/es/news-room/04-11-2026-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
      ru: {
        title: 'Исследования вакцин и препаратов против эболавирусной инфекции: в испытание включат две новые вакцины-кандидата',
        url: 'https://www.who.int/ru/news-room/04-11-2026-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
      ar: {
        title: 'إدراج لقاحين تجريبيين جديدين في تجربة لقاحات الإيبولا إبّان إحراز التقدم في البحوث المتعلّقة بالعلاج',
        url: 'https://www.who.int/ar/news-room/24-05-1448-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
      zh: {
        title: '埃博拉治疗研究取得进展，两款新候选疫苗将加入试验',
        url: 'https://www.who.int/zh/news/item/04-11-2026-two-new-candidate-vaccines-to-join-ebola-trial-as-treatment-research-advances',
      },
    },
    published: '2026-11-04',
    checked: '2026-11-19',
  },
  africaCdcKenya: {
    publisher: 'africaCdc',
    versions: {
      en: {
        title: 'Africa CDC Stands with Kenya, Calls for Lifting of Unjustified Ebola Travel Restrictions',
        url: 'https://africacdc.org/news-item/africa-cdc-stands-with-kenya-calls-for-lifting-of-unjustified-ebola-travel-restrictions/',
      },
      fr: {
        title: 'Africa CDC solidaire du Kenya, appelle à la levée des restrictions de voyage injustifiées liées à Ebola',
        url: 'https://africacdc.org/news-item/africa-cdc-solidaire-du-kenya-appelle-a-la-levee-des-restrictions-de-voyage-injustifiees-liees-a-ebola/',
      },
    },
    published: '2026-11-03',
    checked: '2026-11-19',
  },
  drcSitrep166: {
    publisher: 'drcMoh',
    versions: {
      fr: {
        title: 'Rapport de situation de la 17e épidémie de la maladie à virus Ebola, SitRep N°166 (27 octobre 2026)',
        url: 'https://insp.cd/sitrep-n166-mve-bdbv-27-10-2026/',
      },
    },
    published: '2026-10-28',
    checked: '2026-11-19',
  },
  drcSitrep173: {
    publisher: 'drcMoh',
    versions: {
      fr: {
        title: 'Rapport de situation de la 17e épidémie de la maladie à virus Ebola, SitRep N°173 (3 novembre 2026)',
        url: 'https://insp.cd/sitrep-n173-mve-bdbv-03-11-2026/',
      },
    },
    published: '2026-11-04',
    checked: '2026-11-19',
  },
  drcSitrep158: {
    publisher: 'drcMoh',
    versions: {
      fr: {
        title: 'Rapport de situation de la 17e épidémie de la maladie à virus Ebola, SitRep N°158 (19 octobre 2026)',
        url: 'https://insp.cd/sitrep-n158-mve-bdbv-19-10-2026/',
      },
    },
    published: '2026-10-20',
    checked: '2026-11-19',
  },
  cdcBasics: {
    publisher: 'cdc',
    versions: {
      en: { title: 'Ebola Disease Basics', url: 'https://www.cdc.gov/ebola/about/index.html' },
      es: {
        title: 'Información básica sobre la enfermedad del Ébola',
        url: 'https://www.cdc.gov/ebola/es/about/index.html',
      },
    },
    published: '2026-06-02',
    checked: '2026-11-19',
  },
  cdcSpread: {
    publisher: 'cdc',
    versions: {
      en: { title: 'How Ebola Disease Spreads', url: 'https://www.cdc.gov/ebola/causes/index.html' },
      es: {
        title: 'Cómo se propaga la enfermedad del Ébola',
        url: 'https://www.cdc.gov/ebola/es/causes/como-se-propaga-la-enfermedad-del-ebola.html',
      },
    },
    published: '2026-06-02',
    checked: '2026-11-19',
  },
  cdcSymptoms: {
    publisher: 'cdc',
    versions: {
      en: {
        title: 'Signs and Symptoms of Ebola Disease',
        url: 'https://www.cdc.gov/ebola/signs-symptoms/index.html',
      },
      es: {
        title: 'Signos y síntomas de la enfermedad del Ébola',
        url: 'https://www.cdc.gov/ebola/es/signs-symptoms/signos-y-sintomas-de-la-enfermedad-del-ebola.html',
      },
    },
    published: '2024-04-23',
    checked: '2026-11-19',
  },
  cdcVaccine: {
    publisher: 'cdc',
    versions: {
      en: {
        title: 'Ebola Vaccine Product Information',
        url: 'https://www.cdc.gov/ebola/hcp/vaccines/index.html',
      },
    },
    published: '2025-01-30',
    checked: '2026-11-19',
  },
  cdcSituation: {
    publisher: 'cdc',
    versions: {
      en: {
        title: 'Ebola Outbreak: Current Situation',
        url: 'https://www.cdc.gov/ebola/situation-summary/index.html',
      },
    },
    published: '2026-11-18',
    checked: '2026-11-21',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export function isSourceId(value: string): value is SourceId {
  return value in SOURCES;
}

/**
 * The version of a source to show a reader: their own language if the
 * publisher offers it, otherwise English, otherwise the first available one.
 */
export function sourceVersionFor(
  id: SourceId,
  locale: Locale,
): SourceVersion & { lang: Locale } {
  const versions: Partial<Record<Locale, SourceVersion>> = SOURCES[id].versions;
  const order: Locale[] = [locale, 'en', ...(Object.keys(versions) as Locale[])];
  for (const lang of order) {
    const version = versions[lang];
    if (version) return { ...version, lang };
  }
  throw new Error(`Source ${id} has no versions`);
}
