"use client";

import Link from "next/link";
import { siteTranslations, type SiteLocale } from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import { AgencyLogo } from "./AgencyLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";

type FooterPageKind = "privacy" | "aiDisclosure";

type FooterInfoPageProps = {
  kind: FooterPageKind;
};

type FooterInfoContent = {
  title: string;
  intro: string;
  updated: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

const pageContent: Record<SiteLocale, Record<FooterPageKind, FooterInfoContent>> = {
  pt: {
    privacy: {
      title: "Politica de privacidade",
      intro:
        "Esta pagina explica quais dados podem ser tratados ao usar o catalogo imobiliario e os formularios de contacto.",
      updated: "Atualizado em 2026-05-12",
      sections: [
        {
          title: "Que dados recolhemos",
          paragraphs: [
            "Podemos receber nome, telefone, email, preferencias de pesquisa, mensagens enviadas pelos formularios e identificadores dos imoveis de interesse.",
            "Tambem guardamos preferencias tecnicas, como idioma, favoritos e lista de comparacao, para melhorar a experiencia no catalogo.",
          ],
        },
        {
          title: "Como usamos os dados",
          paragraphs: [
            "Usamos os dados para responder a pedidos, selecionar imoveis relevantes, manter historico de contacto e melhorar o funcionamento do site.",
            "Os dados nao sao vendidos. O acesso e limitado a pessoas que ajudam a processar pedidos imobiliarios e a administrar o site.",
          ],
        },
        {
          title: "Cookies e armazenamento local",
          paragraphs: [
            "O site pode usar cookies e localStorage para guardar idioma, sessao, favoritos, comparacao e preferencias de catalogo.",
            "Pode limpar esses dados nas configuracoes do navegador; algumas funcoes personalizadas podem deixar de estar disponiveis.",
          ],
        },
        {
          title: "Contacto",
          paragraphs: [
            "Para perguntas sobre dados pessoais, contacte info@irina-realestate.com ou +351 912 345 678.",
          ],
        },
      ],
    },
    aiDisclosure: {
      title: "Divulgacao sobre IA",
      intro:
        "Algumas imagens, descricoes auxiliares e propostas de design podem ser criadas ou melhoradas com ferramentas de inteligencia artificial.",
      updated: "Atualizado em 2026-05-12",
      sections: [
        {
          title: "Onde a IA pode ser usada",
          paragraphs: [
            "A IA pode ajudar a gerar variantes de interiores, transformar imagens demonstrativas, preparar descricoes e traduzir conteudo do catalogo.",
            "Imagens marcadas como AI ou geradas sao materiais ilustrativos e podem diferir do estado real do imovel.",
          ],
        },
        {
          title: "Limites",
          paragraphs: [
            "Resultados de IA devem ser verificados antes de decisoes de compra, arrendamento ou renovacao.",
            "Medidas, plantas, custos e solucoes visuais podem conter imprecisoes e nao substituem avaliacao profissional.",
          ],
        },
        {
          title: "Dados enviados para geracao",
          paragraphs: [
            "Quando usa funcoes de geracao, fotografias e parametros introduzidos podem ser enviados ao fornecedor tecnico de IA para criar o resultado pedido.",
            "Nao envie documentos sensiveis ou dados pessoais desnecessarios nas imagens ou mensagens.",
          ],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy policy",
      intro:
        "This page explains what data may be processed when using the property catalog and contact forms.",
      updated: "Updated on 2026-05-12",
      sections: [
        {
          title: "Data we collect",
          paragraphs: [
            "We may receive name, phone, email, search preferences, form messages, and identifiers of properties you are interested in.",
            "We also store technical preferences such as language, favorites, compare list, and catalog settings to improve the experience.",
          ],
        },
        {
          title: "How we use data",
          paragraphs: [
            "We use data to respond to requests, select relevant properties, keep contact history, and improve the site.",
            "Data is not sold. Access is limited to people who help process real estate requests and administer the site.",
          ],
        },
        {
          title: "Cookies and local storage",
          paragraphs: [
            "The site may use cookies and localStorage to save language, session, favorites, compare list, and catalog preferences.",
            "You can clear this data in your browser settings; some personalized features may no longer be available.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "For personal data questions, contact info@irina-realestate.com or +351 912 345 678.",
          ],
        },
      ],
    },
    aiDisclosure: {
      title: "AI disclosure",
      intro:
        "Some images, supporting descriptions, and design proposals may be created or improved with artificial intelligence tools.",
      updated: "Updated on 2026-05-12",
      sections: [
        {
          title: "Where AI may be used",
          paragraphs: [
            "AI may help generate interior variants, transform demo images, prepare descriptions, and translate catalog content.",
            "Images marked as AI or generated are illustrative materials and may differ from the actual condition of a property.",
          ],
        },
        {
          title: "Limitations",
          paragraphs: [
            "AI results should be checked before purchase, rental, or renovation decisions.",
            "Measurements, layouts, costs, and visual solutions may contain inaccuracies and do not replace professional assessment.",
          ],
        },
        {
          title: "Data sent for generation",
          paragraphs: [
            "When generation features are used, uploaded photos and entered parameters may be sent to the technical AI provider to create the requested result.",
            "Do not upload sensitive documents or unnecessary personal data in images or messages.",
          ],
        },
      ],
    },
  },
  ru: {
    privacy: {
      title: "Политика конфиденциальности",
      intro:
        "Эта страница объясняет, какие данные могут обрабатываться при использовании каталога недвижимости и контактных форм.",
      updated: "Обновлено 12.05.2026",
      sections: [
        {
          title: "Какие данные мы собираем",
          paragraphs: [
            "Мы можем получать имя, телефон, email, параметры поиска, сообщения из форм и идентификаторы объектов, которые вас заинтересовали.",
            "Также сохраняются технические предпочтения: язык, избранное, список сравнения и настройки каталога.",
          ],
        },
        {
          title: "Как используются данные",
          paragraphs: [
            "Данные нужны, чтобы отвечать на запросы, подбирать подходящие объекты, вести историю обращений и улучшать работу сайта.",
            "Мы не продаём данные. Доступ ограничен людьми, которые помогают обрабатывать заявки по недвижимости и администрировать сайт.",
          ],
        },
        {
          title: "Cookies и локальное хранение",
          paragraphs: [
            "Сайт может использовать cookies и localStorage для сохранения языка, сессии, избранного, сравнения и предпочтений каталога.",
            "Вы можете удалить эти данные в настройках браузера; часть персональных функций после этого может быть недоступна.",
          ],
        },
        {
          title: "Контакты",
          paragraphs: [
            "По вопросам персональных данных можно написать на info@irina-realestate.com или позвонить +351 912 345 678.",
          ],
        },
      ],
    },
    aiDisclosure: {
      title: "Раскрытие информации об ИИ",
      intro:
        "Некоторые изображения, вспомогательные описания и дизайн-предложения могут создаваться или улучшаться инструментами искусственного интеллекта.",
      updated: "Обновлено 12.05.2026",
      sections: [
        {
          title: "Где может использоваться ИИ",
          paragraphs: [
            "ИИ может помогать генерировать варианты интерьера, трансформировать демонстрационные изображения, готовить описания и переводить контент каталога.",
            "Изображения с пометкой AI или сгенерированные изображения являются иллюстративными материалами и могут отличаться от реального состояния объекта.",
          ],
        },
        {
          title: "Ограничения",
          paragraphs: [
            "Результаты ИИ нужно проверять перед решениями о покупке, аренде или ремонте.",
            "Размеры, планировки, стоимость и визуальные решения могут содержать неточности и не заменяют профессиональную оценку.",
          ],
        },
        {
          title: "Данные для генерации",
          paragraphs: [
            "При использовании функций генерации загруженные фотографии и введённые параметры могут передаваться техническому поставщику ИИ для создания результата.",
            "Не загружайте чувствительные документы и лишние персональные данные в изображениях или сообщениях.",
          ],
        },
      ],
    },
  },
  uk: {
    privacy: {
      title: "Політика конфіденційності",
      intro:
        "Ця сторінка пояснює, які дані можуть оброблятися під час використання каталогу нерухомості та контактних форм.",
      updated: "Оновлено 12.05.2026",
      sections: [
        {
          title: "Які дані ми збираємо",
          paragraphs: [
            "Ми можемо отримувати ім'я, телефон, email, параметри пошуку, повідомлення з форм і ідентифікатори об'єктів, які вас зацікавили.",
            "Також зберігаються технічні налаштування: мова, обране, список порівняння і налаштування каталогу.",
          ],
        },
        {
          title: "Як використовуються дані",
          paragraphs: [
            "Дані потрібні, щоб відповідати на запити, підбирати релевантні об'єкти, вести історію звернень і покращувати роботу сайту.",
            "Ми не продаємо дані. Доступ обмежений людьми, які допомагають обробляти заявки щодо нерухомості й адмініструвати сайт.",
          ],
        },
        {
          title: "Cookies і локальне зберігання",
          paragraphs: [
            "Сайт може використовувати cookies і localStorage для збереження мови, сесії, обраного, порівняння і налаштувань каталогу.",
            "Ви можете видалити ці дані в налаштуваннях браузера; частина персональних функцій після цього може бути недоступною.",
          ],
        },
        {
          title: "Контакти",
          paragraphs: [
            "З питань персональних даних можна написати на info@irina-realestate.com або зателефонувати +351 912 345 678.",
          ],
        },
      ],
    },
    aiDisclosure: {
      title: "Розкриття інформації про ШІ",
      intro:
        "Деякі зображення, допоміжні описи й дизайн-пропозиції можуть створюватися або покращуватися інструментами штучного інтелекту.",
      updated: "Оновлено 12.05.2026",
      sections: [
        {
          title: "Де може використовуватися ШІ",
          paragraphs: [
            "ШІ може допомагати генерувати варіанти інтер'єру, трансформувати демонстраційні зображення, готувати описи і перекладати контент каталогу.",
            "Зображення з позначкою AI або згенеровані зображення є ілюстративними матеріалами й можуть відрізнятися від реального стану об'єкта.",
          ],
        },
        {
          title: "Обмеження",
          paragraphs: [
            "Результати ШІ потрібно перевіряти перед рішеннями про купівлю, оренду або ремонт.",
            "Розміри, планування, вартість і візуальні рішення можуть містити неточності й не замінюють професійну оцінку.",
          ],
        },
        {
          title: "Дані для генерації",
          paragraphs: [
            "Під час використання функцій генерації завантажені фотографії й введені параметри можуть передаватися технічному постачальнику ШІ для створення результату.",
            "Не завантажуйте чутливі документи й зайві персональні дані в зображеннях або повідомленнях.",
          ],
        },
      ],
    },
  },
};

export function FooterInfoPage({ kind }: FooterInfoPageProps) {
  const [language, setSiteLanguage] = useSiteLocale();
  const t = siteTranslations[language];
  const content = pageContent[language][kind];

  return (
    <main className="site-page-background min-h-screen text-slate-950">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="-my-5 flex items-center sm:-my-7">
            <AgencyLogo priority className="h-[52px] w-auto sm:h-[68px]" />
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <LanguageSwitcher language={language} onChange={setSiteLanguage} />
            <Link
              href="/"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
            >
              {t.backToCatalog}
            </Link>
          </div>
        </div>

        <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {t.legalInfo}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {content.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{content.intro}</p>
            <div className="mt-4 text-sm font-semibold text-slate-400">{content.updated}</div>
          </div>

          <div className="mt-8 grid gap-5">
            {content.sections.map((section) => (
              <section
                key={section.title}
                className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-5"
              >
                <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
                <div className="grid gap-3 text-sm leading-7 text-slate-600">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
