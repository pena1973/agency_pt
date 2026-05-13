"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DEFAULT_PROPERTY_COVER_URL,
  getPropertyImageStyle,
} from "@/lib/real-estate/property-cover";
import {
  featureTranslations,
  propertyTypeTranslations,
  siteLocales,
  type SiteLocale,
} from "@/lib/i18n/site";
import { useSiteLocale } from "@/lib/i18n/use-site-locale";
import { normalizeCityName } from "@/lib/real-estate/city";
import type {
  CustomerInquiry,
  EnergyRating,
  HeatingType,
  ListingFeature,
  PropertyContentTranslation,
  PropertyCondition,
  PropertyListing,
  PropertyType,
  RegisteredUser,
  TransportMode,
} from "@/lib/real-estate/types";
import type { GenerateRoomDesignResult, RoomType } from "@/lib/room-ai/types";

type AdminDashboardProps = {
  initialProperties: PropertyListing[];
  initialInquiries: CustomerInquiry[];
  initialUsers: RegisteredUser[];
};

type AdminTab = "catalog" | "inquiries" | "users";
type AdminCatalogModeFilter = "all" | PropertyListing["mode"];
type PendingLeaveAction =
  | { kind: "select"; property: PropertyListing }
  | { kind: "create" };

type UploadedAdminPhoto = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  selectedForAi: boolean;
  roomType: RoomType;
};

type AiSourcePhoto = {
  id: string;
  imageUrl: string;
  name: string;
  roomType: RoomType;
};

type AdminSpareGalleryItem = {
  id: string;
  imageUrl: string;
  title: string;
  source: "upload" | "ai";
  createdAt: string;
};

type GalleryDragSource = "main" | "spare" | "ai-result" | "gif-result";
type CollapsibleAdminSection = "property" | "photos" | "ai" | "gif";
type GifImageSlot = "start" | "finish";
type GifFrameSettings = {
  x: number;
  y: number;
};

type GenerationBalance = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalImages: number;
  totalCostUsd: number;
  totalCostEur?: number;
  entriesCount: number;
};

const emptyGenerationBalance: GenerationBalance = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalImages: 0,
  totalCostUsd: 0,
  totalCostEur: 0,
  entriesCount: 0,
};

const adminTranslations = {
  pt: {
    dashboardTitle: "Painel de administrador",
    catalogAi: "Catalogo e AI",
    inquiries: "Pedidos de clientes",
    users: "Utilizadores",
    siteCatalog: "Catalogo do site",
    logout: "Sair",
    newProperty: "Novo imovel",
    propertyObject: "Imovel",
    aiTranslate: "Traduzir com AI",
    aiTranslating: "AI a traduzir...",
    translateFrom: "Traduzir de",
    translateSameLanguage: "Escolha um idioma de origem diferente do idioma da interface.",
    translationReady: "A traducao foi adicionada ao rascunho. Verifique e guarde o imovel.",
    translations: "Traducoes",
    saveProperty: "Guardar imovel",
    activate: "Ativar",
    unpublish: "Retirar da publicacao",
    jsonEditor: "Editor JSON",
    deleteProperty: "Eliminar imovel",
    openProperty: "Abrir imovel",
    title: "Titulo",
    translation: "traducao",
    mode: "Modo",
    sale: "Venda",
    rent: "Arrendamento",
    price: "Preco",
    publishedAt: "Data de publicacao",
    propertyId: "ID",
    taxes: "Impostos e escritura",
    shortDescription: "Descricao curta",
    fullDescription: "Descricao completa",
    city: "Cidade",
    location: "Localizacao",
    address: "Endereco",
    fillCoordinates: "Preencher coordenadas pelo endereco",
    latitude: "Latitude",
    longitude: "Longitude",
    propertyType: "Tipo de imovel",
    orientation: "Orientacao",
    photoUpload: "Carregar fotografias",
    chooseFiles: "Escolher ficheiros",
    takePhoto: "Tirar fotografia",
    clientInquiriesTitle: "Pedidos recebidos de clientes",
    registeredUsers: "Utilizadores registados",
    noUsers: "Ainda nao foram encontrados utilizadores.",
    catalog: "Catalogo",
    of: "de",
    properties: "imoveis",
    filter: "Filtro",
    allProperties: "Todos os imoveis",
    searchById: "Pesquisar por ID",
    idExample: "Exemplo: 1778062918727",
    active: "ativo",
    inactive: "inativo",
    nothingFound: "Nada encontrado com o filtro atual.",
    condition: "Estado",
    yearBuilt: "Ano de construcao",
    floor: "Piso",
    buildingFloors: "Pisos",
    energyClass: "Classe energetica",
    areaM2: "Area/largura, m²",
    landAreaM2: "Area, m²",
    bedrooms: "Quartos",
    bathrooms: "Casas de banho",
    balconies: "Varandas",
    parkingSpaces: "Estacion.",
    plotArea: "Terreno, m²",
    heating: "Aquecimento",
    features: "Caracteristicas",
    transportAccess: "Acessibilidade de transportes",
    addRoute: "Adicionar rota",
    delete: "Eliminar",
    stop: "Paragem",
    walkTime: "5 min a pe",
    noRoutes: "Ainda nao ha rotas.",
    defaultBadge: "default",
    currentPhotos: "Fotografias atuais do imovel",
    reorderPhotosHelp: "Arraste para alterar a ordem ou mover para a reserva.",
    cover: "Capa",
    currentCover: "Capa atual",
    makeCover: "Definir como capa",
    noPhotos: "O imovel ainda nao tem fotografias.",
    spareGallery: "Galeria de reserva",
    spareGalleryHelp: "Arraste para ca da galeria principal ou devolva a foto para a principal",
    spareGalleryEmpty: "A galeria de reserva esta vazia.",
    uploadedCount: "Fotografias carregadas",
    uploadHelp: "Pode carregar uma ou varias fotografias",
    photosAiTitle: "Fotografias e variantes AI",
    photosAiHelp: "Carregue fotos, marque os enquadramentos para limpeza e geracao, depois mova as melhores variantes para as fotografias do imovel.",
    aiSources: "Fontes para AI",
    aiDropSource: "Arraste para ca uma foto da galeria principal ou de reserva",
    generatedVariant: "Variante gerada",
    clearGeneratedVariant: "Limpar",
    aiResultPlaceholder: "O resultado da geracao de mobiliario aparecera aqui. Podera arrasta-lo para a galeria principal ou de reserva.",
    palette: "Paleta",
    generateFurniture: "Gerar mobiliario",
    generatingVariant: "A gerar variante...",
    generationBalance: "Saldo acumulado das geracoes",
    tokens: "Tokens",
    images: "Imagens",
    records: "Registos",
    remove: "Remover",
    roomType: "Tipo de divisao",
    photoSavedToSpare: "Foto guardada na galeria de reserva. Arraste-a para as fontes AI ou para a galeria principal.",
    dragImageToGallery: "Arraste a imagem para a galeria principal, se gostar da variante.",
    download: "Descarregar",
    gifTitle: "GIF de transformacao do imovel",
    gifHelp: "Crie uma GIF leve: vista inicial, transformacao suave e resultado AI final.",
    startPhoto: "Foto inicial",
    finishPhoto: "Foto final",
    readyGif: "GIF pronta",
    reset: "Repor",
    startSeconds: "Mostrar inicial, seg.",
    transitionSeconds: "Transformacao, seg.",
    finishSeconds: "Mostrar resultado, seg.",
    generateGif: "Gerar GIF",
    generatingGif: "A gerar GIF...",
    gifPlaceholder: "Aqui aparecera o resultado da animacao. Podera arrasta-lo para a galeria principal ou de reserva.",
    inquiriesHelp: "Aqui aparecem todos os pedidos enviados pelo formulario geral e pelas fichas dos imoveis.",
    propertyInquiry: "Pedido sobre imovel",
    generalInquiry: "Pedido geral de selecao",
    openUser: "Abrir utilizador",
    deleteInquiry: "Eliminar pedido",
    deleteUser: "Eliminar utilizador",
    confirmDeleteInquiry: "Eliminar este pedido?",
    confirmDeleteUser: "Eliminar este utilizador?",
    inquiryDeleted: "Pedido eliminado.",
    userDeleted: "Utilizador eliminado.",
    markReviewed: "Marcar como visto",
    returnToNew: "Voltar a novo",
    phone: "Telefone",
    messengers: "Mensageiros",
    name: "Nome",
    user: "Utilizador",
    property: "Imovel",
    areaTypology: "Area e tipologia",
    need: "Necessidade",
    message: "Mensagem",
    noInquiries: "Ainda nao ha pedidos do site.",
    registration: "Registo",
    siteUser: "Utilizador do site",
    lastActivity: "Ultima atividade",
    userSearchTitle: "O que o utilizador procurou",
    deal: "Negocio",
    purchase: "Compra",
    notSpecified: "Nao indicado",
    cities: "Cidades",
    budget: "Orcamento",
    mustHave: "Preferencias principais",
    favorites: "Favoritos",
    compareList: "Lista de comparacao",
    openCard: "Abrir ficha",
    titlePlaceholder: "Ex.: villa junto ao oceano",
    savedLater: "Depois de guardar",
    shortDescriptionPlaceholder: "Descreva brevemente o imovel",
    fullDescriptionPlaceholder: "Descricao completa do imovel",
    cityPlaceholder: "Ex.: Lisboa",
    orientationPlaceholder: "sul, este",
  },
  en: {
    dashboardTitle: "Admin dashboard",
    catalogAi: "Catalog and AI",
    inquiries: "Client inquiries",
    users: "Users",
    siteCatalog: "Site catalog",
    logout: "Sign out",
    newProperty: "New property",
    propertyObject: "Property",
    aiTranslate: "AI translate",
    aiTranslating: "AI is translating...",
    translateFrom: "Translate from",
    translateSameLanguage: "Choose a source language different from the interface language.",
    translationReady: "The translation was added to the draft. Check it and save the property.",
    translations: "Translations",
    saveProperty: "Save property",
    activate: "Activate",
    unpublish: "Unpublish",
    jsonEditor: "JSON editor",
    deleteProperty: "Delete property",
    openProperty: "Open property",
    title: "Title",
    translation: "translation",
    mode: "Mode",
    sale: "Sale",
    rent: "Rent",
    price: "Price",
    publishedAt: "Publication date",
    propertyId: "ID",
    taxes: "Taxes and closing costs",
    shortDescription: "Short description",
    fullDescription: "Full description",
    city: "City",
    location: "Location",
    address: "Address",
    fillCoordinates: "Fill coordinates from address",
    latitude: "Latitude",
    longitude: "Longitude",
    propertyType: "Property type",
    orientation: "Orientation",
    photoUpload: "Photo upload",
    chooseFiles: "Choose files",
    takePhoto: "Take photo",
    clientInquiriesTitle: "Received client inquiries",
    registeredUsers: "Registered users",
    noUsers: "No users found yet.",
    catalog: "Catalog",
    of: "of",
    properties: "properties",
    filter: "Filter",
    allProperties: "All properties",
    searchById: "Search by ID",
    idExample: "Example: 1778062918727",
    active: "active",
    inactive: "inactive",
    nothingFound: "Nothing found for the current filter.",
    condition: "Condition",
    yearBuilt: "Year built",
    floor: "Floor",
    buildingFloors: "Floors",
    energyClass: "Energy class",
    areaM2: "Area/size, m²",
    landAreaM2: "Area, m²",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    balconies: "Balconies",
    parkingSpaces: "Parking",
    plotArea: "Plot, m²",
    heating: "Heating",
    features: "Features",
    transportAccess: "Transport access",
    addRoute: "Add route",
    delete: "Delete",
    stop: "Stop",
    walkTime: "5 min walk",
    noRoutes: "No routes yet.",
    defaultBadge: "default",
    currentPhotos: "Current property photos",
    reorderPhotosHelp: "Drag to change order or move to spare.",
    cover: "Cover",
    currentCover: "Current cover",
    makeCover: "Make cover",
    noPhotos: "This property has no photos yet.",
    spareGallery: "Spare gallery",
    spareGalleryHelp: "Drag here from the main gallery or drag a photo back to the main gallery",
    spareGalleryEmpty: "The spare gallery is empty.",
    uploadedCount: "Uploaded photos",
    uploadHelp: "You can upload one or several photos",
    photosAiTitle: "Photos and AI variants",
    photosAiHelp: "Upload photos, mark frames for cleanup and generation, then move the best variants to the property photos.",
    aiSources: "AI sources",
    aiDropSource: "Drag a photo here from the main or spare gallery",
    generatedVariant: "Generated variant",
    clearGeneratedVariant: "Clear",
    aiResultPlaceholder: "The furniture generation result will appear here. You can drag it to the main or spare gallery.",
    palette: "Palette",
    generateFurniture: "Generate furniture",
    generatingVariant: "Generating variant...",
    generationBalance: "Accumulated generation balance",
    tokens: "Tokens",
    images: "Images",
    records: "Records",
    remove: "Remove",
    roomType: "Room type",
    photoSavedToSpare: "Photo saved to the spare gallery. Drag it to AI sources or to the main gallery.",
    dragImageToGallery: "Drag the image to the main gallery if this variant works.",
    download: "Download",
    gifTitle: "Property transformation GIF",
    gifHelp: "Create a light GIF: initial view, smooth transformation, and final AI result.",
    startPhoto: "Start photo",
    finishPhoto: "Final photo",
    readyGif: "Ready GIF",
    reset: "Reset",
    startSeconds: "Show start, sec.",
    transitionSeconds: "Transformation, sec.",
    finishSeconds: "Show result, sec.",
    generateGif: "Generate GIF",
    generatingGif: "Generating GIF...",
    gifPlaceholder: "The animation result will appear here. You can drag it to the main or spare gallery.",
    inquiriesHelp: "All requests sent from the general selection form and property cards are shown here.",
    propertyInquiry: "Property inquiry",
    generalInquiry: "General selection request",
    openUser: "Open user",
    deleteInquiry: "Delete inquiry",
    deleteUser: "Delete user",
    confirmDeleteInquiry: "Delete this inquiry?",
    confirmDeleteUser: "Delete this user?",
    inquiryDeleted: "Inquiry deleted.",
    userDeleted: "User deleted.",
    markReviewed: "Mark reviewed",
    returnToNew: "Return to new",
    phone: "Phone",
    messengers: "Messengers",
    name: "Name",
    user: "User",
    property: "Property",
    areaTypology: "Area and typology",
    need: "Needed",
    message: "Message",
    noInquiries: "No site inquiries yet.",
    registration: "Registration",
    siteUser: "Site user",
    lastActivity: "Last activity",
    userSearchTitle: "What the user searched for",
    deal: "Deal",
    purchase: "Purchase",
    notSpecified: "Not specified",
    cities: "Cities",
    budget: "Budget",
    mustHave: "Key wishes",
    favorites: "Favorites",
    compareList: "Compare list",
    openCard: "Open card",
    titlePlaceholder: "Example: Oceanfront villa",
    savedLater: "After saving",
    shortDescriptionPlaceholder: "Briefly describe the property",
    fullDescriptionPlaceholder: "Full property description",
    cityPlaceholder: "Example: Lisbon",
    orientationPlaceholder: "south, east",
  },
  ru: {
    dashboardTitle: "Панель администратора",
    catalogAi: "Каталог и AI",
    inquiries: "Обращения клиентов",
    users: "Пользователи",
    siteCatalog: "Каталог сайта",
    logout: "Выйти",
    newProperty: "Новый объект",
    propertyObject: "Объект недвижимости",
    aiTranslate: "ИИ перевести",
    aiTranslating: "ИИ переводит...",
    translateFrom: "Перевести с",
    translateSameLanguage: "Выберите исходный язык, отличный от языка интерфейса.",
    translationReady: "Перевод добавлен в черновик. Проверьте и сохраните объект.",
    translations: "Переводы",
    saveProperty: "Сохранить объект",
    activate: "Сделать активным",
    unpublish: "Снять с публикации",
    jsonEditor: "JSON редактор",
    deleteProperty: "Удалить объект",
    openProperty: "Открыть объект",
    title: "Заголовок",
    translation: "перевод",
    mode: "Режим",
    sale: "Продажа",
    rent: "Аренда",
    price: "Цена",
    publishedAt: "Дата публикации",
    propertyId: "ID",
    taxes: "Налоги и оформление",
    shortDescription: "Краткое описание",
    fullDescription: "Полное описание",
    city: "Город",
    location: "Локация",
    address: "Адрес",
    fillCoordinates: "Заполнить координаты по адресу",
    latitude: "Широта",
    longitude: "Долгота",
    propertyType: "Тип объекта",
    orientation: "Ориентация",
    photoUpload: "Загрузка фотографий",
    chooseFiles: "Выбрать файлы",
    takePhoto: "Сделать фотографию",
    clientInquiriesTitle: "Полученные обращения клиентов",
    registeredUsers: "Зарегистрированные пользователи",
    noUsers: "Пользователи пока не найдены.",
    catalog: "Каталог",
    of: "из",
    properties: "объектов",
    filter: "Фильтр",
    allProperties: "Все объекты",
    searchById: "Поиск по ID",
    idExample: "Например: 1778062918727",
    active: "активен",
    inactive: "неактивен",
    nothingFound: "По текущему фильтру ничего не найдено.",
    condition: "Состояние",
    yearBuilt: "Год постройки",
    floor: "Этаж",
    buildingFloors: "Этажность",
    energyClass: "Энергокласс",
    areaM2: "Ширина/площадь, м²",
    landAreaM2: "Площадь, м²",
    bedrooms: "Спальни",
    bathrooms: "Ванные",
    balconies: "Балконов",
    parkingSpaces: "Парк. мест",
    plotArea: "Участок, м²",
    heating: "Отопление",
    features: "Особенности",
    transportAccess: "Транспортная доступность",
    addRoute: "Добавить маршрут",
    delete: "Удалить",
    stop: "Остановка",
    walkTime: "5 минут пешком",
    noRoutes: "Пока нет маршрутов.",
    defaultBadge: "default",
    currentPhotos: "Текущие фотографии объекта",
    reorderPhotosHelp: "Перетащите, чтобы изменить порядок или убрать в запасные.",
    cover: "Обложка",
    currentCover: "Текущая обложка",
    makeCover: "Сделать обложкой",
    noPhotos: "У объекта пока нет фотографий.",
    spareGallery: "Запасная галерея",
    spareGalleryHelp: "Перетащите сюда из основной или перетащите фото обратно в основную",
    spareGalleryEmpty: "Запасная галерея пока пустая.",
    uploadedCount: "Загружено фото",
    uploadHelp: "Можно загрузить одно или несколько фото",
    photosAiTitle: "Фотографии и AI-варианты",
    photosAiHelp: "Загружайте фото, отмечайте нужные кадры для очистки и генерации, затем переносите лучшие варианты в фотографии объекта.",
    aiSources: "Исходники для AI",
    aiDropSource: "Перетащите сюда фото из основной или запасной галереи",
    generatedVariant: "Сгенерированный вариант",
    clearGeneratedVariant: "Очистить",
    aiResultPlaceholder: "Здесь появится результат генерации мебели. Его можно будет перетащить в основную или запасную галерею.",
    palette: "Палитра",
    generateFurniture: "Сгенерировать мебель",
    generatingVariant: "Генерируем вариант...",
    generationBalance: "Накопленный баланс генераций",
    tokens: "Токены",
    images: "Изображений",
    records: "Записей",
    remove: "Убрать",
    roomType: "Тип комнаты",
    photoSavedToSpare: "Фото сохранено в запасную галерею. Перетащите его в поле исходников для AI или в основную галерею.",
    dragImageToGallery: "Перетащите изображение в основную галерею, если вариант подходит.",
    download: "Скачать",
    gifTitle: "GIF превращения объекта",
    gifHelp: "Соберите лёгкую GIF-анимацию: исходный вид, плавное превращение и финальный AI-результат.",
    startPhoto: "Стартовое фото",
    finishPhoto: "Финальное фото",
    readyGif: "Готовая GIF",
    reset: "Сбросить",
    startSeconds: "Показ исходника, сек.",
    transitionSeconds: "Превращение, сек.",
    finishSeconds: "Показ результата, сек.",
    generateGif: "Сгенерировать GIF",
    generatingGif: "Генерируем GIF...",
    gifPlaceholder: "Здесь появится результат анимации изменения объекта. Его можно будет перетащить в основную или запасную галерею.",
    inquiriesHelp: "Здесь видны все заявки, отправленные с общей формы подбора и из карточек объектов.",
    propertyInquiry: "Обращение по объекту",
    generalInquiry: "Общий запрос на подбор",
    openUser: "Открыть пользователя",
    deleteInquiry: "Удалить запрос",
    deleteUser: "Удалить пользователя",
    confirmDeleteInquiry: "Удалить этот запрос?",
    confirmDeleteUser: "Удалить этого пользователя?",
    inquiryDeleted: "Запрос удален.",
    userDeleted: "Пользователь удален.",
    markReviewed: "Пометить просмотренным",
    returnToNew: "Вернуть в новые",
    phone: "Телефон",
    messengers: "Мессенджеры",
    name: "Имя",
    user: "Пользователь",
    property: "Объект",
    areaTypology: "Площадь и типология",
    need: "Что необходимо",
    message: "Сообщение",
    noInquiries: "Пока нет обращений с сайта.",
    registration: "Регистрация",
    siteUser: "Пользователь сайта",
    lastActivity: "Последняя активность",
    userSearchTitle: "Что искал пользователь",
    deal: "Сделка",
    purchase: "Покупка",
    notSpecified: "Не указано",
    cities: "Города",
    budget: "Бюджет",
    mustHave: "Ключевые пожелания",
    favorites: "Избранное",
    compareList: "Список сравнения",
    openCard: "Открыть карточку",
    titlePlaceholder: "Например: Вилла у океана",
    savedLater: "После сохранения",
    shortDescriptionPlaceholder: "Кратко опишите объект",
    fullDescriptionPlaceholder: "Полное описание объекта",
    cityPlaceholder: "Например: Лиссабон",
    orientationPlaceholder: "юг, восток",
  },
  uk: {
    dashboardTitle: "Панель адміністратора",
    catalogAi: "Каталог і AI",
    inquiries: "Звернення клієнтів",
    users: "Користувачі",
    siteCatalog: "Каталог сайту",
    logout: "Вийти",
    newProperty: "Новий об'єкт",
    propertyObject: "Об'єкт нерухомості",
    aiTranslate: "AI перекласти",
    aiTranslating: "AI перекладає...",
    translateFrom: "Перекласти з",
    translateSameLanguage: "Виберіть вихідну мову, відмінну від мови інтерфейсу.",
    translationReady: "Переклад додано в чернетку. Перевірте і збережіть об'єкт.",
    translations: "Переклади",
    saveProperty: "Зберегти об'єкт",
    activate: "Зробити активним",
    unpublish: "Зняти з публікації",
    jsonEditor: "JSON редактор",
    deleteProperty: "Видалити об'єкт",
    openProperty: "Відкрити об'єкт",
    title: "Заголовок",
    translation: "переклад",
    mode: "Режим",
    sale: "Продаж",
    rent: "Оренда",
    price: "Ціна",
    publishedAt: "Дата публікації",
    propertyId: "ID",
    taxes: "Податки та оформлення",
    shortDescription: "Короткий опис",
    fullDescription: "Повний опис",
    city: "Місто",
    location: "Локація",
    address: "Адреса",
    fillCoordinates: "Заповнити координати за адресою",
    latitude: "Широта",
    longitude: "Довгота",
    propertyType: "Тип об'єкта",
    orientation: "Орієнтація",
    photoUpload: "Завантаження фотографій",
    chooseFiles: "Вибрати файли",
    takePhoto: "Зробити фотографію",
    clientInquiriesTitle: "Отримані звернення клієнтів",
    registeredUsers: "Зареєстровані користувачі",
    noUsers: "Користувачів поки не знайдено.",
    catalog: "Каталог",
    of: "з",
    properties: "об'єктів",
    filter: "Фільтр",
    allProperties: "Усі об'єкти",
    searchById: "Пошук за ID",
    idExample: "Наприклад: 1778062918727",
    active: "активний",
    inactive: "неактивний",
    nothingFound: "За поточним фільтром нічого не знайдено.",
    condition: "Стан",
    yearBuilt: "Рік побудови",
    floor: "Поверх",
    buildingFloors: "Поверховість",
    energyClass: "Енергоклас",
    areaM2: "Ширина/площа, м²",
    landAreaM2: "Площа, м²",
    bedrooms: "Спальні",
    bathrooms: "Ванні",
    balconies: "Балконів",
    parkingSpaces: "Паркомісць",
    plotArea: "Ділянка, м²",
    heating: "Опалення",
    features: "Особливості",
    transportAccess: "Транспортна доступність",
    addRoute: "Додати маршрут",
    delete: "Видалити",
    stop: "Зупинка",
    walkTime: "5 хвилин пішки",
    noRoutes: "Маршрутів поки немає.",
    defaultBadge: "default",
    currentPhotos: "Поточні фотографії об'єкта",
    reorderPhotosHelp: "Перетягніть, щоб змінити порядок або прибрати в запасні.",
    cover: "Обкладинка",
    currentCover: "Поточна обкладинка",
    makeCover: "Зробити обкладинкою",
    noPhotos: "В об'єкта поки немає фотографій.",
    spareGallery: "Запасна галерея",
    spareGalleryHelp: "Перетягніть сюди з основної або поверніть фото в основну",
    spareGalleryEmpty: "Запасна галерея поки порожня.",
    uploadedCount: "Завантажено фото",
    uploadHelp: "Можна завантажити одне або кілька фото",
    photosAiTitle: "Фотографії та AI-варіанти",
    photosAiHelp: "Завантажуйте фото, позначайте потрібні кадри для очищення й генерації, потім переносіть найкращі варіанти у фотографії об'єкта.",
    aiSources: "Джерела для AI",
    aiDropSource: "Перетягніть сюди фото з основної або запасної галереї",
    generatedVariant: "Згенерований варіант",
    clearGeneratedVariant: "Очистити",
    aiResultPlaceholder: "Тут з'явиться результат генерації меблів. Його можна буде перетягнути в основну або запасну галерею.",
    palette: "Палітра",
    generateFurniture: "Згенерувати меблі",
    generatingVariant: "Генеруємо варіант...",
    generationBalance: "Накопичений баланс генерацій",
    tokens: "Токени",
    images: "Зображень",
    records: "Записів",
    remove: "Прибрати",
    roomType: "Тип кімнати",
    photoSavedToSpare: "Фото збережено в запасну галерею. Перетягніть його в джерела AI або в основну галерею.",
    dragImageToGallery: "Перетягніть зображення в основну галерею, якщо варіант підходить.",
    download: "Завантажити",
    gifTitle: "GIF перетворення об'єкта",
    gifHelp: "Зберіть легку GIF-анімацію: початковий вигляд, плавне перетворення і фінальний AI-результат.",
    startPhoto: "Стартове фото",
    finishPhoto: "Фінальне фото",
    readyGif: "Готова GIF",
    reset: "Скинути",
    startSeconds: "Показ початку, сек.",
    transitionSeconds: "Перетворення, сек.",
    finishSeconds: "Показ результату, сек.",
    generateGif: "Згенерувати GIF",
    generatingGif: "Генеруємо GIF...",
    gifPlaceholder: "Тут з'явиться результат анімації зміни об'єкта. Його можна буде перетягнути в основну або запасну галерею.",
    inquiriesHelp: "Тут видно всі заявки, надіслані із загальної форми підбору та з карток об'єктів.",
    propertyInquiry: "Звернення щодо об'єкта",
    generalInquiry: "Загальний запит на підбір",
    openUser: "Відкрити користувача",
    deleteInquiry: "Видалити запит",
    deleteUser: "Видалити користувача",
    confirmDeleteInquiry: "Видалити цей запит?",
    confirmDeleteUser: "Видалити цього користувача?",
    inquiryDeleted: "Запит видалено.",
    userDeleted: "Користувача видалено.",
    markReviewed: "Позначити переглянутим",
    returnToNew: "Повернути в нові",
    phone: "Телефон",
    messengers: "Месенджери",
    name: "Ім'я",
    user: "Користувач",
    property: "Об'єкт",
    areaTypology: "Площа і типологія",
    need: "Що потрібно",
    message: "Повідомлення",
    noInquiries: "Поки немає звернень із сайту.",
    registration: "Реєстрація",
    siteUser: "Користувач сайту",
    lastActivity: "Остання активність",
    userSearchTitle: "Що шукав користувач",
    deal: "Угода",
    purchase: "Купівля",
    notSpecified: "Не вказано",
    cities: "Міста",
    budget: "Бюджет",
    mustHave: "Ключові побажання",
    favorites: "Обране",
    compareList: "Список порівняння",
    openCard: "Відкрити картку",
    titlePlaceholder: "Наприклад: Вілла біля океану",
    savedLater: "Після збереження",
    shortDescriptionPlaceholder: "Коротко опишіть об'єкт",
    fullDescriptionPlaceholder: "Повний опис об'єкта",
    cityPlaceholder: "Наприклад: Лісабон",
    orientationPlaceholder: "південь, схід",
  },
} satisfies Record<SiteLocale, Record<string, string>>;

const DEFAULT_TAX_PROFILE: NonNullable<PropertyListing["taxProfile"]> = {
  propertyTransferTaxRate: 0.06,
  stampDutyRate: 0.008,
  notaryEstimateRate: 0.01,
};

const roomTypeOptions: Array<{ value: RoomType; label: string }> = [
  { value: "bedroom", label: "Спальня" },
  { value: "living_room", label: "Гостиная" },
  { value: "kids_room", label: "Детская" },
  { value: "office", label: "Кабинет" },
  { value: "kitchen", label: "Кухня" },
];

const paletteOptions = [
  { value: "light", label: "Светлая" },
  { value: "warm", label: "Теплая" },
  { value: "dark", label: "Темная" },
  { value: "pastel", label: "Пастельная" },
  { value: "scandinavian", label: "Скандинавская" },
] as const;

const localizedRoomTypeLabels: Record<SiteLocale, Record<RoomType, string>> = {
  pt: {
    bedroom: "Quarto",
    living_room: "Sala",
    kids_room: "Quarto infantil",
    office: "Escritorio",
    kitchen: "Cozinha",
  },
  en: {
    bedroom: "Bedroom",
    living_room: "Living room",
    kids_room: "Kids room",
    office: "Office",
    kitchen: "Kitchen",
  },
  ru: {
    bedroom: "Спальня",
    living_room: "Гостиная",
    kids_room: "Детская",
    office: "Кабинет",
    kitchen: "Кухня",
  },
  uk: {
    bedroom: "Спальня",
    living_room: "Вітальня",
    kids_room: "Дитяча",
    office: "Кабінет",
    kitchen: "Кухня",
  },
};

const paletteLabels: Record<
  SiteLocale,
  Record<(typeof paletteOptions)[number]["value"], string>
> = {
  pt: {
    light: "Clara",
    warm: "Quente",
    dark: "Escura",
    pastel: "Pastel",
    scandinavian: "Escandinava",
  },
  en: {
    light: "Light",
    warm: "Warm",
    dark: "Dark",
    pastel: "Pastel",
    scandinavian: "Scandinavian",
  },
  ru: {
    light: "Светлая",
    warm: "Теплая",
    dark: "Темная",
    pastel: "Пастельная",
    scandinavian: "Скандинавская",
  },
  uk: {
    light: "Світла",
    warm: "Тепла",
    dark: "Темна",
    pastel: "Пастельна",
    scandinavian: "Скандинавська",
  },
};

const defaultGifFrameSettings: GifFrameSettings = {
  x: 50,
  y: 50,
};

const extendedPropertyTypeOptions: Array<{ value: PropertyType; label: string }> = [
  { value: "apartment", label: "Квартира" },
  { value: "duplex", label: "Дуплекс" },
  { value: "land", label: "Участок" },
  { value: "loft", label: "Лофт" },
  { value: "penthouse", label: "Пентхаус" },
  { value: "room", label: "Комната" },
  { value: "studio", label: "Студия" },
  { value: "townhouse", label: "Таунхаус" },
  { value: "villa", label: "Вилла" },
];

const propertyConditionOptions: Array<{
  value: PropertyCondition;
  label: string;
}> = [
  { value: "new_build", label: "Новостройка" },
  { value: "excellent", label: "В отличном состоянии" },
  { value: "good", label: "Хорошее состояние" },
  { value: "needs_renovation", label: "Нужен ремонт" },
];

type FeatureOption =
  | {
      source: "feature";
      value: ListingFeature;
      label: string;
      compactLabel?: string;
    }
  | {
      source: "detail";
      value:
        | "storageRoom"
        | "elevator"
        | "equippedKitchen"
        | "builtInWardrobes";
      label: string;
      compactLabel?: string;
    };

const listingFeatureOptions: FeatureOption[] = [
  { source: "feature", value: "sea_view", label: "Вид на море", compactLabel: "Вид на море" },
  { source: "feature", value: "city_center", label: "Центр города", compactLabel: "Центр" },
  { source: "feature", value: "parking", label: "Паркинг", compactLabel: "Общ. паркинг" },
  { source: "feature", value: "pool", label: "Бассейн", compactLabel: "Бассейн" },
  { source: "feature", value: "security", label: "Охраняемая территория", compactLabel: "Охрана" },
  { source: "feature", value: "furnished", label: "С мебелью", compactLabel: "Мебель" },
  { source: "feature", value: "balcony", label: "Балкон", compactLabel: "Балкон" },
  { source: "feature", value: "terrace", label: "Терраса", compactLabel: "Терраса" },
  { source: "detail", value: "storageRoom", label: "Кладовая", compactLabel: "Кладовая" },
  { source: "detail", value: "elevator", label: "Лифт", compactLabel: "Лифт" },
  { source: "detail", value: "equippedKitchen", label: "Оснащенная кухня", compactLabel: "Обор. кухня" },
  { source: "detail", value: "builtInWardrobes", label: "Встроенные шкафы", compactLabel: "Встр. шкафы" },
];

const heatingOptions: Array<{ value: HeatingType; label: string }> = [
  { value: "central", label: "Центральное отопление" },
  { value: "underfloor", label: "Теплый пол" },
  { value: "electric", label: "Электрическое" },
  { value: "heat_pump", label: "Тепловой насос" },
  { value: "gas_boiler", label: "Газовый котел" },
  { value: "none", label: "Нет" },
];

const energyRatingOptions: EnergyRating[] = ["A+", "A", "B", "B-", "C", "D"];

const transportModeOptions: Array<{ value: TransportMode; label: string }> = [
  { value: "metro", label: "Метро" },
  { value: "bus", label: "Автобус" },
  { value: "tram", label: "Трамвай" },
  { value: "train", label: "Поезд" },
  { value: "ferry", label: "Паром" },
];

const conditionLabels: Record<SiteLocale, Record<PropertyCondition, string>> = {
  pt: {
    new_build: "Construcao nova",
    excellent: "Excelente estado",
    good: "Bom estado",
    needs_renovation: "Precisa de renovacao",
  },
  en: {
    new_build: "New build",
    excellent: "Excellent condition",
    good: "Good condition",
    needs_renovation: "Needs renovation",
  },
  ru: {
    new_build: "Новостройка",
    excellent: "В отличном состоянии",
    good: "Хорошее состояние",
    needs_renovation: "Нужен ремонт",
  },
  uk: {
    new_build: "Новобудова",
    excellent: "У відмінному стані",
    good: "Гарний стан",
    needs_renovation: "Потрібен ремонт",
  },
};

const heatingLabels: Record<SiteLocale, Record<HeatingType, string>> = {
  pt: {
    central: "Aquecimento central",
    underfloor: "Piso radiante",
    electric: "Eletrico",
    heat_pump: "Bomba de calor",
    gas_boiler: "Caldeira a gas",
    none: "Sem aquecimento",
  },
  en: {
    central: "Central heating",
    underfloor: "Underfloor heating",
    electric: "Electric",
    heat_pump: "Heat pump",
    gas_boiler: "Gas boiler",
    none: "None",
  },
  ru: {
    central: "Центральное отопление",
    underfloor: "Теплый пол",
    electric: "Электрическое",
    heat_pump: "Тепловой насос",
    gas_boiler: "Газовый котел",
    none: "Нет",
  },
  uk: {
    central: "Центральне опалення",
    underfloor: "Тепла підлога",
    electric: "Електричне",
    heat_pump: "Тепловий насос",
    gas_boiler: "Газовий котел",
    none: "Немає",
  },
};

const transportModeLabels: Record<SiteLocale, Record<TransportMode, string>> = {
  pt: {
    metro: "Metro",
    bus: "Autocarro",
    tram: "Eletrico",
    train: "Comboio",
    ferry: "Ferry",
  },
  en: {
    metro: "Metro",
    bus: "Bus",
    tram: "Tram",
    train: "Train",
    ferry: "Ferry",
  },
  ru: {
    metro: "Метро",
    bus: "Автобус",
    tram: "Трамвай",
    train: "Поезд",
    ferry: "Паром",
  },
  uk: {
    metro: "Метро",
    bus: "Автобус",
    tram: "Трамвай",
    train: "Потяг",
    ferry: "Пором",
  },
};

const mockAiImagePool: Record<RoomType, string[]> = {
  bedroom: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80&sat=-5",
  ],
  living_room: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  ],
  kids_room: [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80&hue=20",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80&sat=12",
  ],
  office: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
  ],
};

const roomTypeLabels: Record<RoomType, string> = {
  bedroom: "Спальня",
  living_room: "Гостиная",
  kitchen: "Кухня",
  kids_room: "Детская",
  office: "Кабинет",
};

function cloneProperty(property: PropertyListing): PropertyListing {
  return JSON.parse(JSON.stringify(property)) as PropertyListing;
}

function normalizePropertyCollection(properties: PropertyListing[]): PropertyListing[] {
  return properties.map((property) => normalizePropertyListing(property));
}

function createPropertyTemplate(): PropertyListing {
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: "",
    slug: "",
    isActive: true,
    mode: "sale",
    title: "",
    city: "",
    district: "",
    country: "Португалия",
    location: {
      addressLabel: "",
      latitude: 0,
      longitude: 0,
      googleMapsUrl: buildGoogleMapsUrl(0, 0),
    },
    priceAmount: 0,
    priceLabel: "€0",
    shortDescription: "",
    fullDescription: "",
    bedrooms: 0,
    bathrooms: 0,
    areaM2: 0,
    imageUrl: DEFAULT_PROPERTY_COVER_URL,
    imageGallery: [],
    imageSources: {},
    features: ["city_center"],
    details: {
      propertyType: "apartment",
      usableAreaM2: 0,
      builtAreaM2: 0,
      floor: "",
      exterior: false,
      elevator: false,
      parkingSpaces: 0,
      storageRoom: false,
      builtInWardrobes: false,
      equippedKitchen: false,
      furnished: false,
      balconyCount: 0,
      terraceCount: 0,
      condition: "good",
      yearBuilt: 0,
      heating: "none",
      accessibilityAdapted: false,
      orientation: [],
      energyRating: "B",
      bathroomsFull: 0,
    },
    transportAccess: [],
    taxProfile: { ...DEFAULT_TAX_PROFILE },
    agentName: "Ирина",
    publishedAt: now,
  };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPriceLabel(priceAmount: number, mode: PropertyListing["mode"]): string {
  const formattedAmount = new Intl.NumberFormat("ru-RU").format(Math.max(0, priceAmount));
  return mode === "rent" ? `€${formattedAmount} / месяц` : `€${formattedAmount}`;
}

function buildGeneratedPropertyId() {
  return String(Date.now());
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function buildPropertySlug(title: string, id: string) {
  const idPart = slugifyValue(id) || buildGeneratedPropertyId();
  const shortIdPart = idPart.replace(/^irina-/, "") || idPart;
  return shortIdPart;
}

function getPropertyPublicPath(property: PropertyListing) {
  const generatedIdSlug = property.id.replace(/^irina-/, "");
  const pathSlug = /^irina-\d+$/.test(property.id) ? generatedIdSlug : property.slug;

  return `/properties/${encodeURIComponent(pathSlug)}`;
}

function getPropertyDisplayId(property: Pick<PropertyListing, "id">) {
  return property.id.replace(/^irina-/, "");
}

function formatAiGenerationCost(
  usageEstimate: GenerateRoomDesignResult["usageEstimate"] | undefined
) {
  if (!usageEstimate) {
    return "";
  }

  const cost = formatEur(
    usageEstimate.estimatedCostEur ?? usdToEur(usageEstimate.estimatedCostUsd)
  );

  return `Примерная стоимость генерации: ${cost}. Токены: ${usageEstimate.totalTokens.toLocaleString("ru-RU")}, изображений: ${usageEstimate.generatedImages}.`;
}

function usdToEur(value: number) {
  return value * 0.92;
}

function formatEur(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function isGeneratedPropertySlugForId(slug: string, id: string) {
  const normalizedSlug = slugifyValue(slug);
  const normalizedId = slugifyValue(id);
  const shortId = normalizedId.replace(/^irina-/, "");

  return Boolean(shortId) && normalizedSlug.includes(shortId);
}

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function parseOrientationValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPropertySourceLocale(property: PropertyListing): SiteLocale {
  return property.sourceLocale ?? "ru";
}

function isBlankLocalizedContent(content: PropertyContentTranslation) {
  return (
    !content.title.trim() &&
    !content.city.trim() &&
    !content.shortDescription.trim() &&
    !content.fullDescription.trim() &&
    content.orientation.length === 0
  );
}

function getEmptyPropertyContentTranslation(): PropertyContentTranslation {
  return {
    title: "",
    city: "",
    shortDescription: "",
    fullDescription: "",
    orientation: [],
  };
}

function getSourcePropertyContent(property: PropertyListing): PropertyContentTranslation {
  return {
    title: property.title,
    city: property.city,
    shortDescription: property.shortDescription,
    fullDescription: property.fullDescription,
    orientation: property.details.orientation,
  };
}

function getPropertyContentForLocale(
  property: PropertyListing,
  locale: SiteLocale
): PropertyContentTranslation {
  if (locale === getPropertySourceLocale(property)) {
    return getSourcePropertyContent(property);
  }

  return property.translations?.[locale] ?? getEmptyPropertyContentTranslation();
}

function normalizeSourceContentForSave(property: PropertyListing): PropertyListing {
  const sourceLocale = getPropertySourceLocale(property);
  const sourceContent = getSourcePropertyContent(property);

  if (!isBlankLocalizedContent(sourceContent)) {
    return property;
  }

  const fallbackEntry = Object.entries(property.translations ?? {}).find(
    ([, translation]) => translation && !isBlankLocalizedContent(translation)
  );

  if (!fallbackEntry) {
    return property;
  }

  const [fallbackLocale, fallbackContent] = fallbackEntry as [
    SiteLocale,
    PropertyContentTranslation,
  ];
  const nextTranslations = { ...property.translations };
  nextTranslations[sourceLocale] = sourceContent;
  delete nextTranslations[fallbackLocale];

  return {
    ...property,
    sourceLocale: fallbackLocale,
    title: fallbackContent.title,
    city: fallbackContent.city,
    shortDescription: fallbackContent.shortDescription,
    fullDescription: fallbackContent.fullDescription,
    details: {
      ...property.details,
      orientation: fallbackContent.orientation,
    },
    translations: nextTranslations,
  };
}

function getPropertyValidationMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Не удалось сохранить объект.";
  }

  const issues = (error as { issues?: Array<{ path?: Array<string | number>; message?: string }> }).issues;
  const firstIssue = issues?.[0];

  if (!firstIssue) {
    return "Не удалось сохранить объект.";
  }

  const path = firstIssue.path?.join(".") || "поле";
  return `Проверьте поле ${path}: ${firstIssue.message ?? "некорректное значение"}.`;
}

function getPropertyDisplayContentForLocale(
  property: PropertyListing,
  locale: SiteLocale
) {
  const sourceContent = getSourcePropertyContent(property);
  const sourceLocale = getPropertySourceLocale(property);
  const translation = property.translations?.[locale];
  const isFallback = locale !== sourceLocale && !translation;

  return {
    content: {
      title: translation?.title || sourceContent.title,
      city: translation?.city || sourceContent.city,
      shortDescription: translation?.shortDescription || sourceContent.shortDescription,
      fullDescription: translation?.fullDescription || sourceContent.fullDescription,
      orientation: translation?.orientation?.length
        ? translation.orientation
        : sourceContent.orientation,
    },
    isFallback,
  };
}

function getLocalizedContentPath(
  property: PropertyListing,
  locale: SiteLocale,
  field: keyof PropertyContentTranslation
) {
  if (locale !== getPropertySourceLocale(property)) {
    return `translations.${locale}.${field}`;
  }

  return field === "orientation" ? "details.orientation" : field;
}

function displayDraftNumberValue(value: number, isNewPropertyDraft: boolean): string | number {
  return isNewPropertyDraft && value === 0 ? "" : value;
}

function clampPercentage(value: number | undefined) {
  return Math.min(
    100,
    Math.max(0, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 50)
  );
}

function clampImageScale(value: number | undefined) {
  return Math.min(
    200,
    Math.max(100, typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 100)
  );
}

function normalizePropertyListing(property: PropertyListing): PropertyListing {
  const nextId = property.id.trim();
  const nextCity = normalizeCityName(property.city);
  const nextLatitude = Number(property.location.latitude);
  const nextLongitude = Number(property.location.longitude);
  const latitude = Number.isFinite(nextLatitude) ? nextLatitude : 38.7223;
  const longitude = Number.isFinite(nextLongitude) ? nextLongitude : -9.1393;
  const normalizedBathrooms = Math.max(
    0,
    property.details.bathroomsFull ?? property.bathrooms
  );
  const nextGallery = Array.from(
    new Set(property.imageGallery.map((imageUrl) => imageUrl.trim()).filter(Boolean))
  );
  const currentCoverImage = property.imageUrl?.trim();
  const normalizedCoverImage =
    currentCoverImage && nextGallery.includes(currentCoverImage)
      ? currentCoverImage
      : nextGallery[0] ?? currentCoverImage ?? DEFAULT_PROPERTY_COVER_URL;
  const normalizedImagePositions = Object.fromEntries(
    nextGallery.map((imageUrl) => {
      const position = property.imagePositions?.[imageUrl];

      return [
        imageUrl,
        {
          x: clampPercentage(position?.x),
          y: clampPercentage(position?.y),
          scale: clampImageScale(position?.scale),
        },
      ];
    })
  );
  const normalizedImageSources: Record<string, "original" | "ai_generated"> = Object.fromEntries(
    nextGallery.map((imageUrl) => [
      imageUrl,
      property.imageSources?.[imageUrl] === "ai_generated"
        ? "ai_generated"
        : "original",
    ])
  ) as Record<string, "original" | "ai_generated">;

  return {
    ...property,
    id: nextId,
    slug:
      !property.slug.trim() || isGeneratedPropertySlugForId(property.slug, nextId)
        ? buildPropertySlug(property.title, nextId || buildGeneratedPropertyId())
        : property.slug.trim(),
    isActive: property.isActive !== false,
    sourceLocale: property.sourceLocale ?? "ru",
    translations: property.translations,
    city: nextCity,
    district: property.district?.trim() || nextCity,
    country: "Португалия",
    priceAmount: Math.max(0, property.priceAmount),
    priceLabel: buildPriceLabel(Math.max(0, property.priceAmount), property.mode),
    bathrooms: normalizedBathrooms,
    imageGallery: nextGallery,
    imageUrl: normalizedCoverImage,
    imagePositions: normalizedImagePositions,
    imageSources: normalizedImageSources,
    location: {
      ...property.location,
      addressLabel: property.location.addressLabel.trim() || "Lisbon, Portugal",
      latitude,
      longitude,
      googleMapsUrl: buildGoogleMapsUrl(latitude, longitude),
    },
    details: {
      ...property.details,
      usableAreaM2: Math.max(0, property.details.usableAreaM2),
      builtAreaM2: Math.max(0, property.details.builtAreaM2),
      plotAreaM2: Math.max(0, property.details.plotAreaM2 ?? 0),
      parkingSpaces: Math.max(0, property.details.parkingSpaces),
      balconyCount: Math.max(0, property.details.balconyCount),
      terraceCount: Math.max(0, property.details.terraceCount),
      yearBuilt: Math.max(0, property.details.yearBuilt),
      bathroomsFull: normalizedBathrooms,
      guestBathrooms: Math.max(0, property.details.guestBathrooms ?? 0),
      buildingFloors: Math.max(0, property.details.buildingFloors ?? 0),
      monthlyCondoFeeEur: Math.max(0, property.details.monthlyCondoFeeEur ?? 0),
      orientation: property.details.orientation.filter(Boolean).length
        ? property.details.orientation.filter(Boolean)
        : ["юг"],
    },
    transportAccess: property.transportAccess.map((route) => ({
      ...route,
      route: route.route.trim(),
      stopName: route.stopName.trim(),
      walkMinutes: Math.max(0, route.walkMinutes),
    })),
    taxProfile: property.taxProfile
      ? {
          propertyTransferTaxRate: Math.max(0, property.taxProfile.propertyTransferTaxRate),
          stampDutyRate: Math.max(0, property.taxProfile.stampDutyRate),
          notaryEstimateRate: Math.max(0, property.taxProfile.notaryEstimateRate),
        }
      : undefined,
    agentName: property.agentName?.trim() || "Ирина",
  };
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (!currentValue || typeof currentValue !== "object") {
      return undefined;
    }

    return (currentValue as Record<string, unknown>)[segment];
  }, source);
}

function buildMockAiResult(
  selectedPhotos: UploadedAdminPhoto[],
  palette: (typeof paletteOptions)[number]["value"]
): GenerateRoomDesignResult {
  const variants = selectedPhotos.flatMap((photo) => {
    const roomLabel = roomTypeLabels[photo.roomType];
    const imagePool = mockAiImagePool[photo.roomType];

    return imagePool.map((imageUrl, imageIndex) => ({
      id: `mock-${photo.id}-${imageIndex + 1}`,
      title: `${roomLabel} · вариант ${imageIndex + 1}`,
      description:
        imageIndex === 0
          ? `Мок-вариант для ${photo.name} с более нейтральной меблировкой.`
          : `Мок-вариант для ${photo.name} с альтернативной расстановкой и палитрой ${palette}.`,
      furniture: [],
      photoImageUrl: imageUrl,
      palette: [palette],
      pros: ["Подходит для теста админки", "Можно сразу прикрепить к объекту"],
      cons: ["Это временный мок, не реальная AI-генерация"],
      layoutSource: "mock" as const,
    }));
  });

  return {
    jobId: `mock-admin-${Date.now()}`,
    roomAnalysis: {
      estimatedDimensions: {
        widthM: null,
        lengthM: null,
        heightM: null,
        confidence: "low",
      },
      detectedObjects: [],
      removableObjects: [],
      fixedElements: [],
      constraints: [],
      notes: ["Временный мок-режим админки"],
    },
    variants,
  };
}

export function AdminDashboard({
  initialProperties,
  initialInquiries,
  initialUsers,
}: AdminDashboardProps) {
  const router = useRouter();
  const [siteLanguage, setSiteLanguage] = useSiteLocale();
  const [activeTab, setActiveTab] = useState<AdminTab>("catalog");
  const [properties, setProperties] = useState<PropertyListing[]>(initialProperties);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(initialInquiries);
  const [users, setUsers] = useState<RegisteredUser[]>(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialUsers[0]?.id ?? null
  );
  const catalogContentScrollRef = useRef<HTMLDivElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const imageNudgeIntervalRef = useRef<number | null>(null);
  const dragAutoScrollFrameRef = useRef<number | null>(null);
  const dragAutoScrollSpeedRef = useRef(0);

  useLayoutEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousWindowScrollX = window.scrollX;
    const previousWindowScrollY = window.scrollY;
    const mediaQuery = window.matchMedia("(min-width: 1536px)");

    function syncPageScrollLock() {
      if (mediaQuery.matches) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    syncPageScrollLock();
    mediaQuery.addEventListener("change", syncPageScrollLock);

    return () => {
      mediaQuery.removeEventListener("change", syncPageScrollLock);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.scrollTo({
        top: previousWindowScrollY,
        left: previousWindowScrollX,
        behavior: "auto",
      });
    };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProperties[0]?.id ?? null
  );
  const [propertyDraft, setPropertyDraft] = useState<PropertyListing | null>(
    initialProperties[0] ? cloneProperty(initialProperties[0]) : null
  );
  const [originalPropertyDraft, setOriginalPropertyDraft] = useState<PropertyListing | null>(
    initialProperties[0] ? cloneProperty(initialProperties[0]) : null
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [adminContentLocale, setAdminContentLocale] = useState<SiteLocale>(siteLanguage);
  const [translationSourceLocale, setTranslationSourceLocale] = useState<SiteLocale>(
    initialProperties[0]?.sourceLocale ?? "ru"
  );
  const [isTranslatingProperty, setIsTranslatingProperty] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedAdminPhoto[]>([]);
  const [aiSourcePhotos, setAiSourcePhotos] = useState<AiSourcePhoto[]>([]);
  const [aiPalette, setAiPalette] =
    useState<(typeof paletteOptions)[number]["value"]>("light");
  const [aiResult, setAiResult] = useState<GenerateRoomDesignResult | null>(null);
  const [freshAiResultUrls, setFreshAiResultUrls] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState("");
  const [currentAiUsageEstimate, setCurrentAiUsageEstimate] =
    useState<GenerateRoomDesignResult["usageEstimate"]>();
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [currentAiPhotoName, setCurrentAiPhotoName] = useState("");
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const [spareGalleryItems, setSpareGalleryItems] = useState<AdminSpareGalleryItem[]>([]);
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<CollapsibleAdminSection, boolean>
  >({
    property: false,
    photos: false,
    ai: false,
    gif: false,
  });
  const [gifStartImageUrl, setGifStartImageUrl] = useState("");
  const [gifFinishImageUrl, setGifFinishImageUrl] = useState("");
  const [gifStartFrame, setGifStartFrame] =
    useState<GifFrameSettings>(defaultGifFrameSettings);
  const [gifFinishFrame, setGifFinishFrame] =
    useState<GifFrameSettings>(defaultGifFrameSettings);
  const [gifStartSeconds, setGifStartSeconds] = useState(3);
  const [gifTransitionSeconds, setGifTransitionSeconds] = useState(5);
  const [gifFinishSeconds, setGifFinishSeconds] = useState(3);
  const [gifStatus, setGifStatus] = useState("");
  const [gifResult, setGifResult] = useState<{
    gifUrl: string;
    sizeBytes: number;
    estimatedCostUsd: number;
    note: string;
  } | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [generationBalance, setGenerationBalance] =
    useState<GenerationBalance>(emptyGenerationBalance);
  const [catalogModeFilter, setCatalogModeFilter] =
    useState<AdminCatalogModeFilter>("all");
  const [catalogIdQuery, setCatalogIdQuery] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState("");
  const [pendingLeaveAction, setPendingLeaveAction] =
    useState<PendingLeaveAction | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  const filteredProperties = properties.filter((property) => {
    const matchesMode =
      catalogModeFilter === "all" ? true : property.mode === catalogModeFilter;
    const normalizedQuery = catalogIdQuery.trim().toLowerCase();
    const matchesId =
      normalizedQuery.length === 0
        ? true
        : property.id.toLowerCase().includes(normalizedQuery) ||
          property.id.replace(/^irina-/, "").toLowerCase().includes(normalizedQuery) ||
          property.slug.toLowerCase().includes(normalizedQuery);

    return matchesMode && matchesId;
  });

  const currentPropertyType = propertyDraft?.details.propertyType;
  const isLandProperty = currentPropertyType === "land";
  const hasAttachedLand = ["house", "villa", "townhouse", "land"].includes(
    currentPropertyType ?? ""
  );
  const showsResidentialFields = Boolean(currentPropertyType) && !isLandProperty;
  const showsSecondaryAreaFields = hasAttachedLand && !isLandProperty;
  const showsPlotAreaField = hasAttachedLand;
  const showsCompactResidentialLayout = showsResidentialFields && !showsSecondaryAreaFields;
  const showsCompactAttachedLandLayout = showsResidentialFields && showsSecondaryAreaFields;
  const showsCompactLayout = showsCompactResidentialLayout || showsCompactAttachedLandLayout;
  const isNewPropertyDraft = selectedId === null;
  const visibleFeatureOptions = listingFeatureOptions.filter((feature) => {
    if (isLandProperty) {
      return (
        feature.source === "feature" &&
        (feature.value === "sea_view" || feature.value === "security")
      );
    }

    return true;
  });
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const usersById = new Map(users.map((user) => [user.id, user] as const));
  const selectedPropertyExists = selectedId
    ? properties.some((property) => property.id === selectedId)
    : false;
  const featureGridClass = showsCompactLayout
    ? "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6"
    : "mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4";
  const adminT = adminTranslations[siteLanguage];
  const localizedPropertyTypeLabels = propertyTypeTranslations[siteLanguage];
  const localizedFeatureLabels = featureTranslations[siteLanguage];
  const visibleAiVariants = aiResult?.variants ?? [];
  const hasAiGeneratedResult =
    visibleAiVariants.length > 0 || Boolean(currentAiUsageEstimate);
  const activePropertyContent = propertyDraft
    ? getPropertyContentForLocale(propertyDraft, adminContentLocale)
    : null;
  const activePropertySourceLocale = propertyDraft
    ? getPropertySourceLocale(propertyDraft)
    : "ru";
  const isEditingSourceContent = adminContentLocale === activePropertySourceLocale;
  const hasUnsavedChanges =
    propertyDraft !== null &&
    originalPropertyDraft !== null &&
    JSON.stringify(propertyDraft) !== JSON.stringify(originalPropertyDraft);

  useEffect(() => {
    setAdminContentLocale(siteLanguage);
  }, [siteLanguage]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!selectedId) {
      setAiResult(null);
      setSpareGalleryItems([]);
      return;
    }

    void loadSavedAiResults(selectedId);
    void loadSpareGallery(selectedId);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      stopImageNudge();
      stopDragAutoScroll();
    };
  }, []);

  useEffect(() => {
    void loadGenerationBalance();
  }, []);

  function openPhotoPicker() {
    const fileInput = photoFileInputRef.current;

    if (!fileInput) {
      return;
    }

    if (typeof fileInput.showPicker === "function") {
      fileInput.showPicker();
      return;
    }

    fileInput.click();
  }

  function openCameraPicker() {
    const fileInput = cameraPhotoInputRef.current;

    if (!fileInput) {
      return;
    }

    if (typeof fileInput.showPicker === "function") {
      fileInput.showPicker();
      return;
    }

    fileInput.click();
  }

  function toggleAdminSection(section: CollapsibleAdminSection) {
    setCollapsedSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  }

  function isSectionCollapsed(section: CollapsibleAdminSection) {
    return collapsedSections[section];
  }

  function renderCollapseButton(section: CollapsibleAdminSection, className = "") {
    const isCollapsed = isSectionCollapsed(section);

    return (
      <button
        type="button"
        onClick={() => toggleAdminSection(section)}
        title={isCollapsed ? "Развернуть" : "Свернуть"}
        aria-label={isCollapsed ? "Развернуть" : "Свернуть"}
        className={`grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold leading-none text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 ${className}`}
      >
        {isCollapsed ? "▾" : "▴"}
      </button>
    );
  }

  async function loadGenerationBalance() {
    try {
      const response = await fetch("/api/admin/generation-balance", {
        cache: "no-store",
      });

      if (!response.ok) {
        setGenerationBalance(emptyGenerationBalance);
        return;
      }

      setGenerationBalance((await response.json()) as GenerationBalance);
    } catch {
      setGenerationBalance(emptyGenerationBalance);
      // Balance is informational; the editor can continue without it.
    }
  }

  function stopDragAutoScroll() {
    dragAutoScrollSpeedRef.current = 0;

    if (dragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }

  function runDragAutoScroll() {
    const scrollContainer = catalogContentScrollRef.current;
    const speed = dragAutoScrollSpeedRef.current;

    if (!scrollContainer || speed === 0) {
      dragAutoScrollFrameRef.current = null;
      return;
    }

    scrollContainer.scrollTop += speed;
    dragAutoScrollFrameRef.current = window.requestAnimationFrame(runDragAutoScroll);
  }

  function updateDragAutoScroll(event: DragEvent<HTMLElement>) {
    const scrollContainer = catalogContentScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const rect = scrollContainer.getBoundingClientRect();
    const edgeSize = Math.min(140, rect.height / 3);
    let nextSpeed = 0;

    if (event.clientY < rect.top + edgeSize) {
      nextSpeed = -Math.ceil(((rect.top + edgeSize - event.clientY) / edgeSize) * 18);
    } else if (event.clientY > rect.bottom - edgeSize) {
      nextSpeed = Math.ceil(((event.clientY - (rect.bottom - edgeSize)) / edgeSize) * 18);
    }

    dragAutoScrollSpeedRef.current = nextSpeed;

    if (nextSpeed !== 0 && dragAutoScrollFrameRef.current === null) {
      dragAutoScrollFrameRef.current = window.requestAnimationFrame(runDragAutoScroll);
    }

    if (nextSpeed === 0 && dragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollFrameRef.current);
      dragAutoScrollFrameRef.current = null;
    }
  }

  async function handleAdminLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  function isFieldChanged(path: string) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      JSON.stringify(getNestedValue(propertyDraft, path)) !==
      JSON.stringify(getNestedValue(originalPropertyDraft, path))
    );
  }

  function withChangedFieldClass(baseClassName: string, path: string) {
    return `${baseClassName}${
      isFieldChanged(path)
        ? " border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
        : ""
    }`;
  }

  function withChangedBlockClass(baseClassName: string, isChanged: boolean) {
    return `${baseClassName}${
      isChanged
        ? " border-amber-500 bg-amber-50 ring-2 ring-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
        : ""
    }`;
  }

  function isFeatureOptionChanged(option: FeatureOption) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    if (option.source === "feature") {
      return (
        propertyDraft.features.includes(option.value) !==
        originalPropertyDraft.features.includes(option.value)
      );
    }

    return Boolean(propertyDraft.details[option.value]) !== Boolean(originalPropertyDraft.details[option.value]);
  }

  function isTransportRouteChanged(index: number) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      JSON.stringify(propertyDraft.transportAccess[index]) !==
      JSON.stringify(originalPropertyDraft.transportAccess[index])
    );
  }

  function isGalleryImageChanged(imageUrl: string, index: number) {
    if (!propertyDraft || !originalPropertyDraft) {
      return false;
    }

    return (
      !originalPropertyDraft.imageGallery.includes(imageUrl) ||
      originalPropertyDraft.imageGallery[index] !== imageUrl ||
      (propertyDraft.imageUrl === imageUrl && originalPropertyDraft.imageUrl !== imageUrl) ||
      JSON.stringify(propertyDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50, scale: 100 }) !==
        JSON.stringify(originalPropertyDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50, scale: 100 })
    );
  }

  function isAiGeneratedImage(imageUrl: string) {
    return (
      propertyDraft?.imageSources?.[imageUrl] === "ai_generated" ||
      spareGalleryItems.some((item) => item.imageUrl === imageUrl && item.source === "ai") ||
      (aiResult?.variants ?? []).some((variant) => variant.photoImageUrl === imageUrl)
    );
  }

  function applySelectedProperty(property: PropertyListing) {
    const normalizedProperty = normalizePropertyListing(property);
    setSelectedId(normalizedProperty.id);
    setPropertyDraft(cloneProperty(normalizedProperty));
    setOriginalPropertyDraft(cloneProperty(normalizedProperty));
    setTranslationSourceLocale(normalizedProperty.sourceLocale ?? "ru");
    setStatusMessage("");
    setGeocodeMessage("");
    setAiStatus("");
    setAiResult(null);
    setFreshAiResultUrls([]);
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    void loadSavedAiResults(normalizedProperty.id);
    void loadSpareGallery(normalizedProperty.id);
  }

  function applyCreatePropertyTemplate() {
    const template = normalizePropertyListing(createPropertyTemplate());
    setGeocodeMessage("");
    setSelectedId(null);
    setPropertyDraft(cloneProperty(template));
    setOriginalPropertyDraft(cloneProperty(template));
    setTranslationSourceLocale(template.sourceLocale ?? "ru");
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    setAiResult(null);
    setFreshAiResultUrls([]);
    setSpareGalleryItems([]);
    setAiStatus("");
  }

  function applyPendingLeaveAction(action: PendingLeaveAction) {
    if (action.kind === "select") {
      applySelectedProperty(action.property);
      return;
    }

    applyCreatePropertyTemplate();
  }

  function requestLeaveAction(action: PendingLeaveAction) {
    if (!hasUnsavedChanges) {
      applyPendingLeaveAction(action);
      return;
    }

    setPendingLeaveAction(action);
    setIsLeaveDialogOpen(true);
  }

  async function handleLeaveDialogSave() {
    const nextAction = pendingLeaveAction;

    if (!nextAction) {
      return;
    }

    const isSaved = await saveSelectedProperty();

    if (!isSaved) {
      return;
    }

    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
    applyPendingLeaveAction(nextAction);
  }

  function handleLeaveDialogDiscard() {
    if (!pendingLeaveAction) {
      return;
    }

    const nextAction = pendingLeaveAction;
    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
    applyPendingLeaveAction(nextAction);
  }

  function handleLeaveDialogCancel() {
    setIsLeaveDialogOpen(false);
    setPendingLeaveAction(null);
  }

  async function selectProperty(property: PropertyListing) {
    requestLeaveAction({ kind: "select", property });
  }

  function openJsonEditor() {
    if (!propertyDraft) {
      return;
    }

    setJsonEditorValue(JSON.stringify(cloneProperty(propertyDraft), null, 2));
    setIsJsonEditorOpen(true);
    setStatusMessage("");
  }

  function setDraftValue<Key extends keyof PropertyListing>(
    key: Key,
    value: PropertyListing[Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, [key]: value } : currentDraft
    );
  }

  function setAdminEditingLocale(locale: SiteLocale) {
    setAdminContentLocale(locale);
    setSiteLanguage(locale);
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            sourceLocale: currentDraft.sourceLocale ?? locale,
          }
        : currentDraft
    );
  }

  function setLocalizedDraftValue<Key extends keyof PropertyContentTranslation>(
    key: Key,
    value: PropertyContentTranslation[Key]
  ) {
    setPropertyDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const sourceLocale = getPropertySourceLocale(currentDraft);

      if (adminContentLocale === sourceLocale) {
        if (key === "orientation") {
          return {
            ...currentDraft,
            details: {
              ...currentDraft.details,
              orientation: value as PropertyListing["details"]["orientation"],
            },
          };
        }

        return {
          ...currentDraft,
          [key]: value,
        };
      }

      const currentTranslation =
        currentDraft.translations?.[adminContentLocale] ??
        getEmptyPropertyContentTranslation();

      return {
        ...currentDraft,
        translations: {
          ...currentDraft.translations,
          [adminContentLocale]: {
            ...currentTranslation,
            [key]: value,
          },
        },
      };
    });
  }

  function applyTranslatedContentToDraft(
    locale: SiteLocale,
    translation: PropertyContentTranslation
  ) {
    setPropertyDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const sourceLocale = getPropertySourceLocale(currentDraft);

      if (locale === sourceLocale) {
        return {
          ...currentDraft,
          title: translation.title,
          city: translation.city,
          shortDescription: translation.shortDescription,
          fullDescription: translation.fullDescription,
          details: {
            ...currentDraft.details,
            orientation: translation.orientation,
          },
        };
      }

      return {
        ...currentDraft,
        translations: {
          ...currentDraft.translations,
          [locale]: translation,
        },
      };
    });
  }

  async function generatePropertyTranslations() {
    if (!selectedId || !propertyDraft) {
      setStatusMessage("Сначала сохраните объект, затем запускайте перевод.");
      return;
    }

    if (translationSourceLocale === siteLanguage) {
      setStatusMessage(adminT.translateSameLanguage);
      return;
    }

    setIsTranslatingProperty(true);
    setStatusMessage("");
    const sourceContent = getPropertyContentForLocale(propertyDraft, translationSourceLocale);

    try {
      const response = await fetch(
        `/api/admin/properties/${selectedId}/translations/ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceLocale: translationSourceLocale,
            targetLocale: siteLanguage,
            sourceContent,
          }),
        }
      );
      const payload = (await response.json()) as {
        error?: string;
        translation?: PropertyContentTranslation;
      };

      if (!response.ok || !payload.translation) {
        setStatusMessage(payload.error ?? "Не удалось создать переводы.");
        return;
      }

      applyTranslatedContentToDraft(siteLanguage, payload.translation);
      setStatusMessage(adminT.translationReady);
    } finally {
      setIsTranslatingProperty(false);
    }
  }

  function setDraftLocationValue<Key extends keyof PropertyListing["location"]>(
    key: Key,
    value: PropertyListing["location"][Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            location: {
              ...currentDraft.location,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  function setDraftDetailsValue<Key extends keyof PropertyListing["details"]>(
    key: Key,
    value: PropertyListing["details"][Key]
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            details: {
              ...currentDraft.details,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  function toggleDraftFeature(feature: ListingFeature) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            features: currentDraft.features.includes(feature)
              ? currentDraft.features.filter((item) => item !== feature)
              : [...currentDraft.features, feature],
          }
        : currentDraft
    );
  }

  function isFeatureOptionChecked(option: FeatureOption) {
    if (!propertyDraft) {
      return false;
    }

    if (option.source === "feature") {
      return propertyDraft.features.includes(option.value);
    }

    return Boolean(propertyDraft.details[option.value]);
  }

  function toggleFeatureOption(option: FeatureOption) {
    if (option.source === "feature") {
      toggleDraftFeature(option.value);
      return;
    }

    setDraftDetailsValue(option.value, !Boolean(propertyDraft?.details[option.value]));
  }

  function setDraftTransportValue(
    index: number,
    key: keyof PropertyListing["transportAccess"][number],
    value: string | number
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: currentDraft.transportAccess.map((route, routeIndex) =>
              routeIndex === index
                ? {
                    ...route,
                    [key]: value,
                  }
                : route
            ),
          }
        : currentDraft
    );
  }

  function addTransportRoute() {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: [
              ...currentDraft.transportAccess,
              {
                mode: "metro",
                route: "",
                stopName: "",
                walkMinutes: 0,
              },
            ],
          }
        : currentDraft
    );
  }

  function removeTransportRoute(index: number) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            transportAccess: currentDraft.transportAccess.filter(
              (_route, routeIndex) => routeIndex !== index
            ),
          }
        : currentDraft
    );
  }

  function setDraftTaxValue(
    key: keyof NonNullable<PropertyListing["taxProfile"]>,
    value: number
  ) {
    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            taxProfile: {
              ...DEFAULT_TAX_PROFILE,
              ...currentDraft.taxProfile,
              [key]: value,
            },
          }
        : currentDraft
    );
  }

  async function fillCoordinatesFromAddress() {
    if (!propertyDraft) {
      return;
    }

    const address = propertyDraft.location.addressLabel.trim();

    if (!address) {
      setGeocodeMessage("Укажите адрес, чтобы заполнить координаты.");
      return;
    }

    setIsGeocodingAddress(true);
    setGeocodeMessage("");

    try {
      const response = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          city: normalizeCityName(propertyDraft.city),
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        latitude?: number;
        longitude?: number;
      };

      if (!response.ok || payload.latitude === undefined || payload.longitude === undefined) {
        setPropertyDraft((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                location: {
                  ...currentDraft.location,
                  latitude: 0,
                  longitude: 0,
                },
              }
            : currentDraft
        );
        setGeocodeMessage(payload.error ?? "Не удалось определить координаты.");
        return;
      }

      setPropertyDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              location: {
                ...currentDraft.location,
                latitude: payload.latitude ?? currentDraft.location.latitude,
                longitude: payload.longitude ?? currentDraft.location.longitude,
              },
            }
          : currentDraft
      );
      setGeocodeMessage("Координаты заполнены по адресу.");
    } catch {
      setPropertyDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              location: {
                ...currentDraft.location,
                latitude: 0,
                longitude: 0,
              },
            }
          : currentDraft
      );
      setGeocodeMessage("Не удалось определить координаты.");
    } finally {
      setIsGeocodingAddress(false);
    }
  }

  async function persistProperty(
    nextProperty: PropertyListing,
    currentId = nextProperty.id
  ): Promise<boolean> {
    const response = await fetch(`/api/admin/properties/${currentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextProperty),
    });

    const responseText = await response.text();
    let payload: {
      error?: string;
      properties?: PropertyListing[];
    } = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = {
        error: response.ok
          ? "Сервер вернул некорректный ответ."
          : `Сервер вернул ошибку ${response.status}.`,
      };
    }

    if (!response.ok || !payload.properties) {
      setStatusMessage(payload.error ?? "Не удалось сохранить объект.");
      return false;
    }

    const normalizedProperties = normalizePropertyCollection(payload.properties);
    const savedProperty =
      normalizedProperties.find((property) => property.id === nextProperty.id) ??
      normalizePropertyListing(nextProperty);

    setProperties(normalizedProperties);
    setSelectedId(savedProperty.id);
    setPropertyDraft(cloneProperty(savedProperty));
    setOriginalPropertyDraft(cloneProperty(savedProperty));
    router.refresh();
    return true;
  }

  async function saveSelectedProperty(): Promise<boolean> {
    if (!propertyDraft) {
      return false;
    }

    const nextId = propertyDraft.id.trim() || buildGeneratedPropertyId();
    const normalizedDraft = normalizeSourceContentForSave({
      ...propertyDraft,
      id: nextId,
    });
    const nextProperty = normalizePropertyListing({
      ...normalizedDraft,
      slug:
        !normalizedDraft.slug.trim() || isGeneratedPropertySlugForId(normalizedDraft.slug, nextId)
          ? buildPropertySlug(normalizedDraft.title, nextId)
          : normalizedDraft.slug.trim(),
    });

    setIsSaving(true);
    setStatusMessage("");

    try {
      if (!selectedId) {
        const response = await fetch("/api/admin/properties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextProperty),
        });

        const responseText = await response.text();
        let payload: {
          error?: string;
          properties?: PropertyListing[];
        } = {};

        try {
          payload = responseText ? JSON.parse(responseText) : {};
        } catch {
          payload = {
            error: response.ok
              ? "Сервер вернул некорректный ответ."
              : `Сервер вернул ошибку ${response.status}.`,
          };
        }

        if (!response.ok || !payload.properties) {
          const validationMessage = getPropertyValidationMessage(payload);
          setStatusMessage(
            payload.error
              ? `${payload.error} ${validationMessage}`
              : validationMessage
          );
          return false;
        }

        const normalizedProperties = normalizePropertyCollection(payload.properties);
        const createdProperty =
          normalizedProperties.find((property) => property.id === nextProperty.id) ??
          normalizePropertyListing(nextProperty);
        setProperties(normalizedProperties);
        setSelectedId(createdProperty.id);
        setPropertyDraft(cloneProperty(createdProperty));
        setOriginalPropertyDraft(cloneProperty(createdProperty));
        setStatusMessage("Объект сохранен.");
        return true;
      }

      const isSaved = await persistProperty(nextProperty, selectedId);

      if (isSaved) {
        setStatusMessage("Объект сохранен.");
        return true;
      }

      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function createProperty() {
    requestLeaveAction({ kind: "create" });
  }

  async function deleteSelectedProperty() {
    if (!selectedId) {
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/admin/properties/${selectedId}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as {
      error?: string;
      properties?: PropertyListing[];
    };

    if (!response.ok || !payload.properties) {
      setStatusMessage(payload.error ?? "Не удалось удалить объект.");
      setIsSaving(false);
      return;
    }

    const normalizedProperties = normalizePropertyCollection(payload.properties);
    const nextSelected = normalizedProperties[0] ?? null;
    setProperties(normalizedProperties);
    setSelectedId(nextSelected?.id ?? null);
    setPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setOriginalPropertyDraft(nextSelected ? cloneProperty(nextSelected) : null);
    setGeocodeMessage("");
    setUploadedPhotos([]);
    setAiSourcePhotos([]);
    setAiResult(null);
    setFreshAiResultUrls([]);
    setSpareGalleryItems([]);
    setStatusMessage("Объект удален.");
    setIsSaving(false);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    if (!propertyDraft) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileContents = await file.text();

    try {
      const parsed = JSON.parse(fileContents) as PropertyListing;
      setJsonEditorValue(JSON.stringify(parsed, null, 2));
      setStatusMessage("JSON объекта загружен в редактор.");
    } catch {
      setStatusMessage("Файл не является валидным JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function exportJson() {
    if (!propertyDraft) {
      return;
    }

    const blob = new Blob([JSON.stringify(propertyDraft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getPropertyDisplayId(propertyDraft)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveJsonEditor() {
    if (!propertyDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(jsonEditorValue) as PropertyListing;
      const nextId = parsed.id.trim() || buildGeneratedPropertyId();
      const nextProperty = normalizePropertyListing({
        ...parsed,
        id: nextId,
        slug: parsed.slug.trim() || buildPropertySlug(parsed.title, nextId),
      });

      if (!selectedId) {
        const response = await fetch("/api/admin/properties", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextProperty),
        });

        const payload = (await response.json()) as {
          error?: string;
          properties?: PropertyListing[];
        };

        if (!response.ok || !payload.properties) {
          setStatusMessage(payload.error ?? "Не удалось создать объект.");
          return;
        }

        const normalizedProperties = normalizePropertyCollection(payload.properties);
        const createdProperty =
          normalizedProperties.find((property) => property.id === nextProperty.id) ??
          normalizePropertyListing(nextProperty);
        setProperties(normalizedProperties);
        setSelectedId(createdProperty.id);
        setPropertyDraft(cloneProperty(createdProperty));
        setOriginalPropertyDraft(cloneProperty(createdProperty));
        setJsonEditorValue(JSON.stringify(createdProperty, null, 2));
        setStatusMessage("JSON объекта сохранен.");
        setIsJsonEditorOpen(false);
        return;
      }

      const isSaved = await persistProperty(nextProperty, selectedId);

      if (isSaved) {
        setJsonEditorValue(JSON.stringify(nextProperty, null, 2));
        setStatusMessage("JSON объекта сохранен.");
        setIsJsonEditorOpen(false);
      }
    } catch {
      setStatusMessage("JSON содержит ошибку.");
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (!propertyDraft?.id || !selectedId) {
      setAiStatus("Сначала сохраните объект, затем загружайте фото в запасную галерею.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("propertyId", propertyDraft.id);

    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      uploads?: Array<{ name: string; url: string }>;
    };

    if (!response.ok || !payload.uploads) {
      setAiStatus(payload.error ?? "Не удалось загрузить фотографии.");
      event.target.value = "";
      return;
    }

    const nextPhotos = payload.uploads.map((upload, index) => ({
      id: `${Date.now()}-${index}-${upload.name}`,
      file: files[index],
      name: upload.name,
      previewUrl: upload.url,
      selectedForAi: true,
      roomType: "living_room" as RoomType,
    }));

    setUploadedPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
    await loadSpareGallery(propertyDraft.id);
    setAiStatus("Фотографии загружены. Можно выбрать кадры для AI-обработки.");
    event.target.value = "";
  }

  function togglePhotoForAi(photoId: string) {
    setUploadedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId
          ? { ...photo, selectedForAi: !photo.selectedForAi }
          : photo
      )
    );
  }

  function setPhotoRoomType(photoId: string, roomType: RoomType) {
    setUploadedPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, roomType } : photo
      )
    );
  }

  function togglePhotoInGallery(imageUrl: string, shouldInclude: boolean) {
    if (!propertyDraft) {
      return;
    }

    setPropertyDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      if (shouldInclude) {
        const nextGallery = currentDraft.imageGallery.includes(imageUrl)
          ? currentDraft.imageGallery
          : [...currentDraft.imageGallery, imageUrl];
        const nextImagePositions = {
          ...currentDraft.imagePositions,
          [imageUrl]: currentDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50, scale: 100 },
        };
        const nextImageSources = {
          ...currentDraft.imageSources,
          [imageUrl]: isAiGeneratedImage(imageUrl) ? "ai_generated" as const : "original" as const,
        };

        return {
          ...currentDraft,
          imageUrl:
            currentDraft.imageUrl === DEFAULT_PROPERTY_COVER_URL || !currentDraft.imageUrl
              ? imageUrl
              : currentDraft.imageUrl,
          imageGallery: nextGallery,
          imagePositions: nextImagePositions,
          imageSources: nextImageSources,
        };
      }

      const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);
      const nextImagePositions = { ...currentDraft.imagePositions };
      const nextImageSources = { ...currentDraft.imageSources };
      delete nextImagePositions[imageUrl];
      delete nextImageSources[imageUrl];

      return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === imageUrl
            ? nextGallery[0] ?? DEFAULT_PROPERTY_COVER_URL
            : currentDraft.imageUrl,
        imageGallery: nextGallery,
        imagePositions: nextImagePositions,
        imageSources: nextImageSources,
      };
    });
  }

  async function addImageFromSpareToGallery(imageUrl: string) {
    const nextDraft = applyGalleryInclusion(propertyDraft, imageUrl, true);

    if (!nextDraft) {
      return;
    }

    setPropertyDraft(nextDraft);
    setSpareGalleryItems((currentItems) =>
      currentItems.filter((item) => item.imageUrl !== imageUrl)
    );
    await persistImmediateGalleryChange(nextDraft, "Фото добавлено в основную галерею.");
  }

  function applyGalleryInclusion(
    currentDraft: PropertyListing | null,
    imageUrl: string,
    shouldInclude: boolean
  ) {
    if (!currentDraft) {
      return null;
    }

    if (shouldInclude) {
      const nextGallery = currentDraft.imageGallery.includes(imageUrl)
        ? currentDraft.imageGallery
        : [...currentDraft.imageGallery, imageUrl];
    const nextImagePositions = {
      ...currentDraft.imagePositions,
      [imageUrl]: currentDraft.imagePositions?.[imageUrl] ?? { x: 50, y: 50, scale: 100 },
    };
    const nextImageSources = {
      ...currentDraft.imageSources,
      [imageUrl]: isAiGeneratedImage(imageUrl) ? "ai_generated" as const : "original" as const,
    };

    return {
        ...currentDraft,
        imageUrl:
          currentDraft.imageUrl === DEFAULT_PROPERTY_COVER_URL || !currentDraft.imageUrl
            ? imageUrl
            : currentDraft.imageUrl,
      imageGallery: nextGallery,
      imagePositions: nextImagePositions,
      imageSources: nextImageSources,
    };
  }

  const nextGallery = currentDraft.imageGallery.filter((item) => item !== imageUrl);
  const nextImagePositions = { ...currentDraft.imagePositions };
  const nextImageSources = { ...currentDraft.imageSources };
  delete nextImagePositions[imageUrl];
  delete nextImageSources[imageUrl];

    return {
      ...currentDraft,
      imageUrl:
        currentDraft.imageUrl === imageUrl
          ? nextGallery[0] ?? DEFAULT_PROPERTY_COVER_URL
          : currentDraft.imageUrl,
    imageGallery: nextGallery,
    imagePositions: nextImagePositions,
    imageSources: nextImageSources,
  };
}

  async function persistImmediateGalleryChange(
    nextDraft: PropertyListing,
    successMessage: string
  ) {
    const saved = await persistProperty(
      normalizePropertyListing(nextDraft),
      selectedPropertyExists ? selectedId ?? nextDraft.id : nextDraft.id
    );

    if (saved) {
      setStatusMessage(successMessage);
    }

    return saved;
  }

  function writeGalleryDragData(
    event: DragEvent<HTMLElement>,
    imageUrl: string,
    source: GalleryDragSource
  ) {
    stopDragAutoScroll();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-admin-gallery-image",
      JSON.stringify({ imageUrl, source })
    );
    event.dataTransfer.setData("text/plain", imageUrl);
  }

  function readGalleryDragData(event: DragEvent<HTMLElement>) {
    const rawData =
      event.dataTransfer.getData("application/x-admin-gallery-image") ||
      event.dataTransfer.getData("text/plain");

    if (!rawData) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawData) as {
        imageUrl?: string;
        source?: GalleryDragSource;
      };

      return parsed.imageUrl
        ? { imageUrl: parsed.imageUrl, source: parsed.source ?? "main" }
        : null;
    } catch {
      return { imageUrl: rawData, source: "main" as const };
    }
  }

  async function reorderMainGallery(draggedImageUrl: string, targetImageUrl: string) {
    if (!propertyDraft || draggedImageUrl === targetImageUrl) {
      return;
    }

    const draggedIndex = propertyDraft.imageGallery.indexOf(draggedImageUrl);
    const targetIndex = propertyDraft.imageGallery.indexOf(targetImageUrl);

    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextGallery = [...propertyDraft.imageGallery];
    const [draggedImage] = nextGallery.splice(draggedIndex, 1);
    nextGallery.splice(targetIndex, 0, draggedImage);
    const nextDraft = {
      ...propertyDraft,
      imageGallery: nextGallery,
    };

    setPropertyDraft(nextDraft);
    await persistImmediateGalleryChange(nextDraft, "Порядок фотографий сохранен.");
  }

  async function handleMainGalleryDrop(
    event: DragEvent<HTMLElement>,
    targetImageUrl?: string
  ) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (
      dragData.source === "spare" ||
      dragData.source === "ai-result" ||
      dragData.source === "gif-result"
    ) {
      await addImageFromSpareToGallery(dragData.imageUrl);
      return;
    }

    if (targetImageUrl) {
      await reorderMainGallery(dragData.imageUrl, targetImageUrl);
    }
  }

  async function handleSpareGalleryDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (dragData.source === "main") {
      await moveImageFromMainToSpare(dragData.imageUrl);
      return;
    }

    if (
      (dragData.source === "ai-result" || dragData.source === "gif-result") &&
      propertyDraft?.id
    ) {
      await ensureImageInSpareGallery(dragData.imageUrl);
    }
  }

  function removeAiResultVariant(imageUrl: string) {
    setFreshAiResultUrls((currentUrls) =>
      currentUrls.filter((currentUrl) => currentUrl !== imageUrl)
    );
    setAiResult((currentResult) => {
      if (!currentResult) {
        return currentResult;
      }

      const nextVariants = currentResult.variants.filter(
        (variant) => variant.photoImageUrl !== imageUrl
      );

      return nextVariants.length > 0
        ? { ...currentResult, variants: nextVariants }
        : null;
    });
  }

  async function ensureImageInSpareGallery(
    imageUrl: string,
    options: { removeFromResult?: boolean } = {}
  ) {
    if (!propertyDraft?.id) {
      return;
    }

    const response = await fetch("/api/admin/spare-gallery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId: propertyDraft.id, imageUrl }),
    });
    const payload = (await response.json()) as {
      error?: string;
      items?: AdminSpareGalleryItem[];
    };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Не удалось добавить фото в запасную галерею.");
      return;
    }

    await loadSpareGallery(propertyDraft.id);
    if (options.removeFromResult ?? true) {
      removeAiResultVariant(imageUrl);
    }
    if ((options.removeFromResult ?? true) && gifResult?.gifUrl === imageUrl) {
      setGifResult(null);
    }
    setStatusMessage("Фотография добавлена в запасную галерею.");
  }

  function addAiSourcePhoto(imageUrl: string) {
    const spareItem = spareGalleryItems.find((item) => item.imageUrl === imageUrl);
    const mainIndex = propertyDraft?.imageGallery.indexOf(imageUrl) ?? -1;
    const name =
      spareItem?.title ??
      (mainIndex >= 0 ? `Фото ${mainIndex + 1} из основной галереи` : "Исходное фото");

    setAiSourcePhotos((currentPhotos) => {
      if (currentPhotos.some((photo) => photo.imageUrl === imageUrl)) {
        return currentPhotos;
      }

      return [
        ...currentPhotos,
        {
          id: `${Date.now()}-${currentPhotos.length + 1}`,
          imageUrl,
          name,
          roomType: "living_room",
        },
      ];
    });
    setAiStatus("Фото добавлено как исходник для генерации.");
  }

  function handleAiSourceDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    addAiSourcePhoto(dragData.imageUrl);
  }

  function handleGifImageDrop(event: DragEvent<HTMLElement>, slot: GifImageSlot) {
    event.preventDefault();

    const dragData = readGalleryDragData(event);

    if (!dragData) {
      return;
    }

    if (slot === "start") {
      setGifStartImageUrl(dragData.imageUrl);
      setGifStartFrame(defaultGifFrameSettings);
    } else {
      setGifFinishImageUrl(dragData.imageUrl);
      setGifFinishFrame(defaultGifFrameSettings);
    }

    setGifStatus("");
  }

  function getGifFrameSettings(slot: GifImageSlot) {
    return slot === "start" ? gifStartFrame : gifFinishFrame;
  }

  function updateGifFrameSetting(
    slot: GifImageSlot,
    key: keyof GifFrameSettings,
    value: number
  ) {
    const setter = slot === "start" ? setGifStartFrame : setGifFinishFrame;
    setter((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  }

  function resetGifFrameSettings(slot: GifImageSlot) {
    const setter = slot === "start" ? setGifStartFrame : setGifFinishFrame;
    setter(defaultGifFrameSettings);
  }

  function clearGifImageSlot(slot: GifImageSlot) {
    resetGifFrameSettings(slot);

    if (slot === "start") {
      setGifStartImageUrl("");
    } else {
      setGifFinishImageUrl("");
    }

    setGifResult(null);
    setGifStatus("");
  }

  function nudgeGifFramePosition(
    slot: GifImageSlot,
    axis: keyof GifFrameSettings,
    delta: number
  ) {
    const setter = slot === "start" ? setGifStartFrame : setGifFinishFrame;
    setter((currentSettings) => ({
      ...currentSettings,
      [axis]: clampPercentage(currentSettings[axis] + delta),
    }));
  }

  function startGifFrameNudge(
    event: PointerEvent<HTMLButtonElement>,
    slot: GifImageSlot,
    axis: keyof GifFrameSettings,
    delta: number
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stopImageNudge();
    nudgeGifFramePosition(slot, axis, delta);
    imageNudgeIntervalRef.current = window.setInterval(() => {
      nudgeGifFramePosition(slot, axis, delta);
    }, 90);
  }

  async function generateTransitionGif() {
    if (!gifStartImageUrl || !gifFinishImageUrl) {
      setGifStatus("Добавьте стартовое и финальное фото.");
      return;
    }

    setIsGeneratingGif(true);
    setGifStatus("");
    setGifResult(null);

    try {
      const response = await fetch("/api/admin/gif", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startImageUrl: gifStartImageUrl,
          finishImageUrl: gifFinishImageUrl,
          startFrame: gifStartFrame,
          finishFrame: gifFinishFrame,
          startSeconds: gifStartSeconds,
          transitionSeconds: gifTransitionSeconds,
          finishSeconds: gifFinishSeconds,
          propertyId: propertyDraft?.id,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        gifUrl?: string;
        sizeBytes?: number;
        estimatedCostUsd?: number;
        note?: string;
      };

      if (!response.ok || !payload.gifUrl) {
        setGifStatus(payload.error ?? "Не удалось сгенерировать GIF.");
        return;
      }

      setGifResult({
        gifUrl: payload.gifUrl,
        sizeBytes: payload.sizeBytes ?? 0,
        estimatedCostUsd: payload.estimatedCostUsd ?? 0,
        note: payload.note ?? "GIF собрана локально через sharp, OpenAI не используется.",
      });
      if (propertyDraft?.id) {
        await ensureImageInSpareGallery(payload.gifUrl, { removeFromResult: false });
      }
      setGifStatus(
        `GIF готов${payload.sizeBytes ? `, размер ${formatBytes(payload.sizeBytes)}` : ""} и добавлен в запасную галерею. Стоимость генерации: ${formatEur(usdToEur(payload.estimatedCostUsd ?? 0))}.`
      );
      await loadGenerationBalance();
    } catch {
      setGifStatus("Не удалось сгенерировать GIF.");
    } finally {
      setIsGeneratingGif(false);
    }
  }

  function removeAiSourcePhoto(imageUrl: string) {
    setAiSourcePhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.imageUrl !== imageUrl)
    );
  }

  function setAiSourceRoomType(photoId: string, roomType: RoomType) {
    setAiSourcePhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === photoId ? { ...photo, roomType } : photo
      )
    );
  }

  async function fetchImageAsFile(imageUrl: string, fileName: string, signal?: AbortSignal) {
    const absoluteUrl = new URL(imageUrl, window.location.origin).toString();
    const response = await fetch(absoluteUrl, { signal });

    if (!response.ok) {
      throw new Error("Image fetch failed");
    }

    const blob = await response.blob();
    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });
  }

  function setCoverImage(imageUrl: string) {
    if (!propertyDraft) {
      return;
    }

    setPropertyDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            imageUrl,
          }
        : currentDraft
    );
    setStatusMessage("Обложка выбрана. Сохраните объект, чтобы закрепить изменение.");
  }

  function nudgeGalleryImagePosition(
    imageUrl: string,
    axis: "x" | "y",
    delta: number
  ) {
    setPropertyDraft((currentDraft) => {
      if (!currentDraft || !currentDraft.imageGallery.includes(imageUrl)) {
        return currentDraft;
      }

      const currentPosition = currentDraft.imagePositions?.[imageUrl] ?? {
        x: 50,
        y: 50,
        scale: 100,
      };

      return {
        ...currentDraft,
        imagePositions: {
          ...currentDraft.imagePositions,
          [imageUrl]: {
            ...currentPosition,
            [axis]: clampPercentage(currentPosition[axis] + delta),
          },
        },
      };
    });
  }

  function stopImageNudge() {
    if (imageNudgeIntervalRef.current) {
      window.clearInterval(imageNudgeIntervalRef.current);
      imageNudgeIntervalRef.current = null;
    }
  }

  function startImageNudge(
    event: PointerEvent<HTMLButtonElement>,
    imageUrl: string,
    axis: "x" | "y",
    delta: number
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stopImageNudge();
    nudgeGalleryImagePosition(imageUrl, axis, delta);
    imageNudgeIntervalRef.current = window.setInterval(() => {
      nudgeGalleryImagePosition(imageUrl, axis, delta);
    }, 90);
  }

  function nudgeGalleryImageScale(imageUrl: string, delta: number) {
    setPropertyDraft((currentDraft) => {
      if (!currentDraft || !currentDraft.imageGallery.includes(imageUrl)) {
        return currentDraft;
      }

      const currentPosition = currentDraft.imagePositions?.[imageUrl] ?? {
        x: 50,
        y: 50,
        scale: 100,
      };

      return {
        ...currentDraft,
        imagePositions: {
          ...currentDraft.imagePositions,
          [imageUrl]: {
            ...currentPosition,
            scale: clampImageScale((currentPosition.scale ?? 100) + delta),
          },
        },
      };
    });
  }

  async function downloadImageToComputer(imageUrl: string, fileName: string) {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        setStatusMessage("Не удалось скачать изображение.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setStatusMessage("Не удалось скачать изображение.");
    }
  }

  async function moveImageFromMainToSpare(imageUrl: string) {
    if (!propertyDraft) {
      return;
    }

    if (propertyDraft.id) {
      const response = await fetch("/api/admin/spare-gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ propertyId: propertyDraft.id, imageUrl }),
      });
      const payload = (await response.json()) as {
        error?: string;
        items?: AdminSpareGalleryItem[];
      };

      if (!response.ok) {
        setStatusMessage(payload.error ?? "Не удалось перенести фото в запасную галерею.");
        return;
      }
    }

    const nextDraft = applyGalleryInclusion(propertyDraft, imageUrl, false);

    if (!nextDraft) {
      return;
    }

    setPropertyDraft(nextDraft);
    const saved = await persistImmediateGalleryChange(
      nextDraft,
      "Фотография перенесена из основной галереи в запасную."
    );

    if (saved && nextDraft.id) {
      await loadSpareGallery(nextDraft.id);
    }
  }

  async function deleteImageFromSpareGallery(imageUrl: string) {
    const response = await fetch("/api/admin/spare-gallery", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Не удалось удалить фото из запасной галереи.");
      return;
    }

    setSpareGalleryItems((currentItems) =>
      currentItems.filter((item) => item.imageUrl !== imageUrl)
    );
    setStatusMessage("Фотография удалена из запасной галереи.");
  }

  function mergeAiResults(
    currentResult: GenerateRoomDesignResult | null,
    nextResult: GenerateRoomDesignResult,
    usageEstimate?: NonNullable<GenerateRoomDesignResult["usageEstimate"]>
  ): GenerateRoomDesignResult {
    const variantsByUrl = new Map(
      (currentResult?.variants ?? []).map((variant) => [variant.photoImageUrl, variant])
    );

    for (const variant of nextResult.variants) {
      variantsByUrl.set(variant.photoImageUrl, variant);
    }

    return {
      ...nextResult,
      roomAnalysis: nextResult.roomAnalysis ?? currentResult?.roomAnalysis ?? null,
      variants: Array.from(variantsByUrl.values()),
      usageEstimate:
        usageEstimate ?? nextResult.usageEstimate ?? currentResult?.usageEstimate,
    };
  }

  function emptyAiUsageEstimate(): NonNullable<GenerateRoomDesignResult["usageEstimate"]> {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      generatedImages: 0,
      estimatedCostUsd: 0,
      estimatedCostEur: 0,
      note:
        "Оценка: текстовые токены взяты из usage, стоимость изображения рассчитана по high quality.",
    };
  }

  function addAiUsageEstimate(
    total: NonNullable<GenerateRoomDesignResult["usageEstimate"]>,
    result: GenerateRoomDesignResult
  ): NonNullable<GenerateRoomDesignResult["usageEstimate"]> {
    return {
      ...total,
      inputTokens: total.inputTokens + (result.usageEstimate?.inputTokens ?? 0),
      outputTokens: total.outputTokens + (result.usageEstimate?.outputTokens ?? 0),
      totalTokens: total.totalTokens + (result.usageEstimate?.totalTokens ?? 0),
      generatedImages: total.generatedImages + (result.usageEstimate?.generatedImages ?? 0),
      estimatedCostUsd:
        total.estimatedCostUsd + (result.usageEstimate?.estimatedCostUsd ?? 0),
      estimatedCostEur:
        total.estimatedCostEur + (result.usageEstimate?.estimatedCostEur ?? 0),
    };
  }

  function cancelAiGeneration() {
    aiAbortControllerRef.current?.abort();
    setAiStatus("Останавливаю генерацию...");
  }

  function clearAiGeneratedVariants() {
    setAiResult(null);
    setFreshAiResultUrls([]);
    setCurrentAiUsageEstimate(undefined);
    setCurrentAiPhotoName("");
    setAiStatus("");
  }

  function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
  }

  async function readRoomAiResponse(response: Response) {
    const responseText = await response.text();

    if (!responseText) {
      return {} as GenerateRoomDesignResult & { error?: string; errorCode?: string };
    }

    try {
      return JSON.parse(responseText) as GenerateRoomDesignResult & {
        error?: string;
        errorCode?: string;
      };
    } catch {
      return {
        error: response.ok
          ? "Сервер вернул неожиданный ответ."
          : `Сервер вернул не JSON-ответ: ${responseText.slice(0, 120)}`,
      } as GenerateRoomDesignResult & { error?: string; errorCode?: string };
    }
  }

  function getRoomAiErrorMessage(
    payload: { error?: string; errorCode?: string },
    photoName: string
  ) {
    if (payload.errorCode === "quota_exceeded") {
      return payload.error ?? "Лимит токенов или квота OpenAI исчерпаны. Пополните баланс API и попробуйте снова.";
    }

    if (payload.errorCode === "rate_limit_exceeded") {
      return payload.error ?? "OpenAI временно ограничил частоту запросов. Подождите немного и попробуйте снова.";
    }

    if (payload.errorCode === "token_limit_exceeded") {
      return payload.error ?? "Превышен лимит токенов для этого запроса. Попробуйте меньше фотографий.";
    }

    return payload.error ?? `Ошибка генерации для фото ${photoName}.`;
  }

  async function generateAiVariants() {
    if (aiSourcePhotos.length === 0) {
      setAiStatus("Перетащите хотя бы одно фото в поле исходников для AI.");
      return;
    }

    if (!selectedId || !propertyDraft?.id) {
      setAiStatus("Сначала сохраните объект, затем запускайте AI-генерацию.");
      return;
    }

    setIsGeneratingAi(true);
    setCurrentAiPhotoName("");
    setCurrentAiUsageEstimate(undefined);
    setAiStatus("Подготавливаю фото для генерации...");
    const abortController = new AbortController();
    aiAbortControllerRef.current = abortController;

    try {
      const generatedResults: GenerateRoomDesignResult[] = [];
      let totalUsage = emptyAiUsageEstimate();

      for (const [photoIndex, photo] of aiSourcePhotos.entries()) {
        if (abortController.signal.aborted) {
          break;
        }

        setCurrentAiPhotoName(photo.name);
        setAiStatus(
          `Обрабатываю фото ${photoIndex + 1} из ${aiSourcePhotos.length}: ${photo.name}`
        );

        const sourceFile = await fetchImageAsFile(
          photo.imageUrl,
          `${photo.id}.jpg`,
          abortController.signal
        );
        const formData = new FormData();
        formData.append("photos", sourceFile, sourceFile.name);
        formData.append("roomType", photo.roomType);
        formData.append("palette", aiPalette);
        formData.append("propertyId", propertyDraft.id);

        const response = await fetch("/api/room-ai/generate", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });
        const payload = await readRoomAiResponse(response);

        if (!response.ok) {
          setAiStatus(getRoomAiErrorMessage(payload, photo.name));
          await loadGenerationBalance();
          return;
        }

        generatedResults.push(payload);
        totalUsage = addAiUsageEstimate(totalUsage, payload);
        setCurrentAiUsageEstimate(totalUsage);

        const resultUrls = payload.variants.map((variant) => variant.photoImageUrl);
        setFreshAiResultUrls((currentUrls) =>
          Array.from(new Set([...currentUrls, ...resultUrls]))
        );
        setAiResult((currentResult) => mergeAiResults(currentResult, payload, totalUsage));
        setAiStatus(
          `Готово фото ${photoIndex + 1} из ${aiSourcePhotos.length}: ${photo.name}. ${formatAiGenerationCost(totalUsage)}`
        );
      }

      await loadSpareGallery(propertyDraft.id);
      if (generatedResults.length === 0 && abortController.signal.aborted) {
        setAiStatus("Генерация прервана. Готовых вариантов пока нет.");
        return;
      }

      if (abortController.signal.aborted) {
        setAiStatus(
          `Генерация прервана. Готово ${generatedResults.length} из ${aiSourcePhotos.length}. ${formatAiGenerationCost(totalUsage)}`
        );
        await loadGenerationBalance();
        return;
      }

      setAiStatus(
        `AI сгенерировал и сохранил ${aiSourcePhotos.length} ${
          aiSourcePhotos.length === 1 ? "вариант" : "варианта"
        }. ${formatAiGenerationCost(totalUsage)}`
      );
      await loadGenerationBalance();
    } catch (error) {
      if (isAbortError(error)) {
        setAiStatus("Генерация прервана. Уже готовые варианты остались в результате.");
        return;
      }

      setAiStatus(error instanceof Error ? error.message : "Ошибка генерации вариантов.");
    } finally {
      setIsGeneratingAi(false);
      setCurrentAiPhotoName("");
      aiAbortControllerRef.current = null;
    }
  }

  async function loadSavedAiResults(propertyId: string) {
    try {
      const response = await fetch(
        `/api/room-ai/generate?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as GenerateRoomDesignResult & {
        error?: string;
      };

      setAiResult(payload.variants.length > 0 ? payload : null);
      if (payload.variants.length > 0) {
        setAiStatus("Загружены сохраненные AI-варианты для этого объекта.");
      }
    } catch {
      // Saved AI results are optional; the editor can continue without them.
    }
  }

  async function loadSpareGallery(propertyId: string) {
    try {
      const response = await fetch(
        `/api/admin/spare-gallery?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        items?: AdminSpareGalleryItem[];
      };

      setSpareGalleryItems(payload.items ?? []);
    } catch {
      // Spare gallery is optional; the editor can continue without it.
    }
  }

  async function updateInquiryStatus(
    inquiryId: string,
    status: CustomerInquiry["status"]
  ) {
    const response = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: inquiryId, status }),
    });

    const payload = (await response.json()) as {
      error?: string;
      inquiries?: CustomerInquiry[];
    };

    if (!response.ok || !payload.inquiries) {
      setStatusMessage(payload.error ?? "Не удалось обновить обращение.");
      return;
    }

    setInquiries(payload.inquiries);
    setStatusMessage("Статус обращения обновлен.");
  }

  async function deleteInquiry(inquiryId: string) {
    if (!window.confirm(adminT.confirmDeleteInquiry)) {
      return;
    }

    const response = await fetch("/api/admin/inquiries", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: inquiryId }),
    });

    const payload = (await response.json()) as {
      error?: string;
      inquiries?: CustomerInquiry[];
    };

    if (!response.ok || !payload.inquiries) {
      setStatusMessage(payload.error ?? "Не удалось удалить запрос.");
      return;
    }

    setInquiries(payload.inquiries);
    setStatusMessage(adminT.inquiryDeleted);
  }

  async function deleteSelectedUser() {
    if (!selectedUser || !window.confirm(adminT.confirmDeleteUser)) {
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: selectedUser.id }),
    });

    const payload = (await response.json()) as {
      error?: string;
      users?: RegisteredUser[];
      inquiries?: CustomerInquiry[];
    };

    if (!response.ok || !payload.users) {
      setStatusMessage(payload.error ?? "Не удалось удалить пользователя.");
      return;
    }

    setUsers(payload.users);
    if (payload.inquiries) {
      setInquiries(payload.inquiries);
    }
    setSelectedUserId(payload.users[0]?.id ?? null);
    setStatusMessage(adminT.userDeleted);
  }

  function getPropertiesByIds(ids: string[]) {
    return ids
      .map((id) => properties.find((property) => property.id === id))
      .filter((property): property is PropertyListing => Boolean(property));
  }

  function formatAdminDate(isoDate: string) {
    const localeCode =
      siteLanguage === "pt"
        ? "pt-PT"
        : siteLanguage === "en"
          ? "en-GB"
          : siteLanguage === "uk"
            ? "uk-UA"
            : "ru-RU";

    return new Intl.DateTimeFormat(localeCode, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoDate));
  }

  return (
    <main className="site-page-background min-h-screen px-3 text-slate-950 sm:px-6 2xl:h-[100dvh] 2xl:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1520px] flex-col py-4 sm:py-8 2xl:h-full 2xl:min-h-0">
          <div className="mb-5 grid shrink-0 gap-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {adminT.dashboardTitle}
            </h1>
            <div className="grid grid-cols-6 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "catalog") {
                  return;
                }

                setActiveTab("catalog");
              }}
              className={`col-span-2 h-9 rounded-2xl px-3 text-xs font-semibold transition sm:h-auto sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === "catalog"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {adminT.catalogAi}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inquiries")}
              className={`col-span-4 inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-semibold transition sm:h-auto sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === "inquiries"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {adminT.inquiries}
              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] leading-none">
                {inquiries.length}
              </span>
            </button>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-semibold transition sm:h-auto sm:px-4 sm:py-3 sm:text-sm ${
                  activeTab === "users"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {adminT.users}
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] leading-none">
                  {users.length}
                </span>
              </button>
              <Link
                href="/"
                className="col-span-2 inline-flex h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 sm:h-auto sm:px-4 sm:py-3 sm:text-sm"
              >
                {adminT.siteCatalog}
              </Link>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="col-span-2 h-9 rounded-2xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800 sm:h-auto sm:px-4 sm:py-3 sm:text-sm"
              >
                {adminT.logout}
              </button>
              <div className="col-span-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:col-span-1">
                {siteLocales.map((locale) => (
                  <button
                    key={locale.code}
                    type="button"
                    onClick={() => setAdminEditingLocale(locale.code)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      siteLanguage === locale.code
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                    aria-pressed={siteLanguage === locale.code}
                  >
                    {locale.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        <div className="sr-only" aria-live="polite">
          {statusMessage}
        </div>

        {isLeaveDialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="text-xl font-semibold text-slate-950">
                Есть несохраненные изменения
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Сохранить изменения перед уходом с текущего объекта?
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleLeaveDialogCancel}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleLeaveDialogDiscard}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Не сохранять
                </button>
                <button
                  type="button"
                  onClick={handleLeaveDialogSave}
                  disabled={isSaving}
                  className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "catalog" ? (
          <div className="flex flex-1 flex-col 2xl:min-h-0 2xl:overflow-hidden">
            <div className="mb-4 shrink-0 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createProperty}
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {adminT.newProperty}
              </button>
            </div>

            <div className="grid flex-1 items-start gap-4 2xl:min-h-0 2xl:grid-cols-[300px_minmax(0,1fr)] 2xl:gap-6 2xl:overflow-hidden">
              <aside className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm 2xl:h-full 2xl:min-h-0 2xl:overflow-hidden">
                <div className="mb-3 text-sm font-semibold text-slate-950">
                  {adminT.catalog}: {filteredProperties.length} {adminT.of} {properties.length} {adminT.properties}
                </div>
                <div className="mb-4 shrink-0 grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {adminT.filter}
                    </span>
                    <select
                      value={catalogModeFilter}
                      onChange={(event) =>
                        setCatalogModeFilter(event.target.value as AdminCatalogModeFilter)
                      }
                      className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="all">{adminT.allProperties}</option>
                      <option value="sale">{adminT.sale}</option>
                      <option value="rent">{adminT.rent}</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {adminT.searchById}
                    </span>
                    <input
                      value={catalogIdQuery}
                      onChange={(event) => setCatalogIdQuery(event.target.value)}
                      placeholder={adminT.idExample}
                      className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>
                <div className="grid max-h-[340px] content-start gap-3 overflow-y-auto overscroll-contain pr-1 2xl:max-h-none 2xl:min-h-0 2xl:flex-1">
                  {filteredProperties.map((property) => {
                    const isActive = property.id === selectedId;
                    const catalogPropertyContent = getPropertyDisplayContentForLocale(
                      property,
                      siteLanguage
                    );

                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => selectProperty(property)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {catalogPropertyContent.content.title}
                          </div>
                          <div className="grid justify-items-end gap-1">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                property.isActive === false
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {property.isActive === false ? adminT.inactive : adminT.active}
                            </span>
                            {catalogPropertyContent.isFallback ? (
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                {adminT.defaultBadge}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {getPropertyDisplayId(property)}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {catalogPropertyContent.content.city} · {property.mode === "sale" ? adminT.sale : adminT.rent}
                        </div>
                      </button>
                    );
                  })}
                  {filteredProperties.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      {adminT.nothingFound}
                    </div>
                  ) : null}
                </div>
              </aside>

              <div
                ref={catalogContentScrollRef}
                onDragOver={updateDragAutoScroll}
                onDragEnd={stopDragAutoScroll}
                onDrop={stopDragAutoScroll}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) {
                    stopDragAutoScroll();
                  }
                }}
                className="min-h-0 pr-1 2xl:h-full 2xl:overflow-y-auto"
              >
                <section className="grid gap-6 pb-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-slate-950">
                        {adminT.propertyObject}
                      </div>
                      {renderCollapseButton("property", "md:hidden")}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={generatePropertyTranslations}
                          disabled={
                            !selectedId ||
                            isTranslatingProperty ||
                            translationSourceLocale === siteLanguage
                          }
                          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {isTranslatingProperty ? adminT.aiTranslating : adminT.aiTranslate}
                        </button>
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{adminT.translateFrom}</span>
                          <select
                            value={translationSourceLocale}
                            onChange={(event) =>
                              setTranslationSourceLocale(event.target.value as SiteLocale)
                            }
                            className="h-8 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400"
                          >
                            {siteLocales.map((locale) => (
                              <option key={locale.code} value={locale.code}>
                                {locale.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:justify-end">
                      {propertyDraft ? (
                        <>
                          <button
                            type="button"
                            onClick={saveSelectedProperty}
                            disabled={isSaving || !propertyDraft}
                            className="col-span-2 flex min-h-10 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-sm font-semibold leading-tight text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60 md:col-span-1 md:min-h-0 md:px-4 md:py-2.5"
                          >
                            {adminT.saveProperty}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftValue("isActive", propertyDraft.isActive === false)
                            }
                            className={`flex min-h-10 items-center justify-center rounded-2xl px-3 py-2 text-center text-sm font-semibold leading-tight transition md:min-h-0 md:px-4 md:py-2.5 ${
                              propertyDraft.isActive === false
                                ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border border-amber-300 bg-amber-50 text-amber-900"
                            }`}
                          >
                            {propertyDraft.isActive === false
                              ? adminT.activate
                              : adminT.unpublish}
                          </button>
                          <button
                            type="button"
                            onClick={openJsonEditor}
                            disabled={!propertyDraft}
                            className="flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60 md:min-h-0 md:px-4 md:py-2.5"
                          >
                            {adminT.jsonEditor}
                          </button>
                          <button
                            type="button"
                            onClick={deleteSelectedProperty}
                            disabled={isSaving || !selectedId}
                            className="flex min-h-10 items-center justify-center rounded-2xl border border-red-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60 md:min-h-0 md:px-4 md:py-2.5"
                          >
                            {adminT.deleteProperty}
                          </button>
                          {selectedId && propertyDraft.slug ? (
                            <a
                              href={`${getPropertyPublicPath(propertyDraft)}?admin_preview=1`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 md:min-h-0 md:px-4 md:py-2.5"
                            >
                              {adminT.openProperty}
                            </a>
                          ) : null}
                        </>
                      ) : null}
                      {renderCollapseButton("property", "hidden md:grid")}
                    </div>
                    </div>
                  </div>

                  {!isSectionCollapsed("property") ? (
                  propertyDraft ? (
                    <div className="admin-form-shell grid gap-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.78fr)_minmax(120px,0.56fr)_minmax(150px,0.72fr)_minmax(140px,0.62fr)]">
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.title}
                            {!isEditingSourceContent ? (
                              <span className="ml-2 text-xs font-medium text-slate-500">
                                {adminT.translation} {adminContentLocale.toUpperCase()}
                              </span>
                            ) : null}
                          </span>
                          <input
                            value={activePropertyContent?.title ?? ""}
                            onChange={(event) =>
                              setLocalizedDraftValue("title", event.target.value)
                            }
                            placeholder={adminT.titlePlaceholder}
                            className={withChangedFieldClass(
                              "h-11 w-full min-w-0 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500",
                              getLocalizedContentPath(propertyDraft, adminContentLocale, "title")
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.mode}
                          </span>
                          <select
                            value={propertyDraft.mode}
                            onChange={(event) =>
                              setDraftValue("mode", event.target.value as PropertyListing["mode"])
                            }
                            className={withChangedFieldClass(
                              "h-11 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-emerald-500",
                              "mode"
                            )}
                          >
                            <option value="sale">{adminT.sale}</option>
                            <option value="rent">{adminT.rent}</option>
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.price}
                          </span>
                          <input
                            value={displayDraftNumberValue(propertyDraft.priceAmount, isNewPropertyDraft)}
                            onChange={(event) =>
                              setDraftValue("priceAmount", toNumber(event.target.value))
                            }
                            placeholder="850000"
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "priceAmount"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.publishedAt}
                          </span>
                          <input
                            value={propertyDraft.publishedAt}
                            onChange={(event) =>
                              setDraftValue("publishedAt", event.target.value)
                            }
                            placeholder="2026-05-06"
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              "publishedAt"
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.propertyId}
                          </span>
                          <input
                            value={getPropertyDisplayId(propertyDraft)}
                            readOnly
                            placeholder={adminT.savedLater}
                            className="h-11 w-full min-w-0 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                          />
                        </label>
                      </div>

                      {propertyDraft.mode === "sale" ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 text-sm font-semibold text-slate-900">
                            {adminT.taxes}
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                IMT
                              </span>
                              <input
                                value={
                                  propertyDraft.taxProfile?.propertyTransferTaxRate ??
                                  DEFAULT_TAX_PROFILE.propertyTransferTaxRate
                                }
                                onChange={(event) =>
                                  setDraftTaxValue(
                                    "propertyTransferTaxRate",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Гербовый сбор
                              </span>
                              <input
                                value={
                                  propertyDraft.taxProfile?.stampDutyRate ??
                                  DEFAULT_TAX_PROFILE.stampDutyRate
                                }
                                onChange={(event) =>
                                  setDraftTaxValue("stampDutyRate", toNumber(event.target.value))
                                }
                                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Нотариус и регистрация
                              </span>
                              <input
                                value={
                                  propertyDraft.taxProfile?.notaryEstimateRate ??
                                  DEFAULT_TAX_PROFILE.notaryEstimateRate
                                }
                                onChange={(event) =>
                                  setDraftTaxValue(
                                    "notaryEstimateRate",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="h-11 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.shortDescription}
                          </span>
                          <textarea
                            value={activePropertyContent?.shortDescription ?? ""}
                            onChange={(event) =>
                              setLocalizedDraftValue("shortDescription", event.target.value)
                            }
                            placeholder={adminT.shortDescriptionPlaceholder}
                            className={withChangedFieldClass(
                              "min-h-[92px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              getLocalizedContentPath(
                                propertyDraft,
                                adminContentLocale,
                                "shortDescription"
                              )
                            )}
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.fullDescription}
                          </span>
                          <textarea
                            value={activePropertyContent?.fullDescription ?? ""}
                            onChange={(event) =>
                              setLocalizedDraftValue("fullDescription", event.target.value)
                            }
                            placeholder={adminT.fullDescriptionPlaceholder}
                            className={withChangedFieldClass(
                              "min-h-[92px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              getLocalizedContentPath(
                                propertyDraft,
                                adminContentLocale,
                                "fullDescription"
                              )
                            )}
                          />
                        </label>
                      </div>

                      <div
                        className={
                          showsCompactLayout
                            ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.55fr)_48px_170px_170px]"
                            : "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.45fr)_48px_170px_170px]"
                        }
                      >
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.city}
                          </span>
                          <input
                            value={activePropertyContent?.city ?? ""}
                            onChange={(event) =>
                              setLocalizedDraftValue("city", event.target.value)
                            }
                            placeholder={adminT.cityPlaceholder}
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              getLocalizedContentPath(propertyDraft, adminContentLocale, "city")
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.address}
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={propertyDraft.location.addressLabel}
                              onChange={(event) =>
                                setDraftLocationValue("addressLabel", event.target.value)
                              }
                              placeholder="Например: Avenida da Liberdade, Lisbon"
                              className={withChangedFieldClass(
                                "h-11 w-full min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500",
                                "location.addressLabel"
                              )}
                            />
                          </div>
                        </label>
                        <div className="relative min-w-0 md:col-span-2 2xl:col-span-3">
                          {geocodeMessage ? (
                            <div className="absolute -top-5 left-[64px] text-xs text-slate-500">
                              {geocodeMessage}
                            </div>
                          ) : null}
                          <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-4">
                            <div className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-transparent">.</span>
                              <button
                                type="button"
                                onClick={fillCoordinatesFromAddress}
                                disabled={isGeocodingAddress}
                                title={adminT.fillCoordinates}
                                className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60"
                              >
                                {isGeocodingAddress ? "..." : "⌖"}
                              </button>
                            </div>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.latitude}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.location.latitude, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftLocationValue("latitude", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "location.latitude"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.longitude}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.location.longitude, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftLocationValue("longitude", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "location.longitude"
                                )}
                              />
                            </label>
                          </div>
                        </div>
                        {!showsCompactLayout ? <div className="min-w-0" /> : null}
                      </div>

                      {showsCompactLayout ? (
                        <>
                          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(150px,0.76fr)_minmax(190px,0.95fr)_110px_110px_110px_minmax(140px,0.58fr)_110px]">
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.propertyType}
                              </span>
                              <select
                                value={propertyDraft.details.propertyType}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "propertyType",
                                    event.target.value as PropertyType
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.propertyType"
                                )}
                              >
                                {extendedPropertyTypeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {localizedPropertyTypeLabels[option.value]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.condition}
                              </span>
                              <select
                                value={propertyDraft.details.condition}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "condition",
                                    event.target.value as PropertyCondition
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.condition"
                                )}
                              >
                                {propertyConditionOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {conditionLabels[siteLanguage][option.value]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.yearBuilt}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.yearBuilt, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "yearBuilt",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="2024"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.yearBuilt"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.floor}
                              </span>
                              <input
                                value={propertyDraft.details.floor ?? ""}
                                onChange={(event) =>
                                  setDraftDetailsValue("floor", event.target.value)
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.floor"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.buildingFloors}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.buildingFloors ?? 0, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "buildingFloors",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.buildingFloors"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.orientation}
                              </span>
                              <input
                                value={(activePropertyContent?.orientation ?? []).join(", ")}
                                onChange={(event) =>
                                  setLocalizedDraftValue(
                                    "orientation",
                                    parseOrientationValue(event.target.value)
                                  )
                                }
                                placeholder={adminT.orientationPlaceholder}
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  getLocalizedContentPath(
                                    propertyDraft,
                                    adminContentLocale,
                                    "orientation"
                                  )
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.energyClass}
                              </span>
                              <select
                                value={propertyDraft.details.energyRating}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "energyRating",
                                    event.target.value as EnergyRating
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.energyRating"
                                )}
                              >
                                {energyRatingOptions.map((rating) => (
                                  <option key={rating} value={rating}>
                                    {rating}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div
                            className={
                              showsCompactAttachedLandLayout
                                ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[160px_82px_82px_92px_104px_104px_minmax(130px,0.7fr)]"
                                : "grid gap-4 md:grid-cols-2 2xl:grid-cols-[160px_82px_82px_92px_104px_minmax(130px,0.7fr)]"
                            }
                          >
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.areaM2}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.areaM2, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("areaM2", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "areaM2"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.bedrooms}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.bedrooms, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("bedrooms", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "bedrooms"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.bathrooms}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.bathrooms, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftValue("bathrooms", toNumber(event.target.value))
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "bathrooms"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.balconies}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.balconyCount, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "balconyCount",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.balconyCount"
                                )}
                              />
                            </label>
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.parkingSpaces}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.parkingSpaces, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "parkingSpaces",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.parkingSpaces"
                                )}
                              />
                            </label>
                            {showsCompactAttachedLandLayout ? (
                              <label className="min-w-0 grid gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  {adminT.plotArea}
                                </span>
                                <input
                                  value={propertyDraft.details.plotAreaM2 ?? 0}
                                  onChange={(event) =>
                                    setDraftDetailsValue(
                                      "plotAreaM2",
                                      toNumber(event.target.value)
                                    )
                                  }
                                  className={withChangedFieldClass(
                                    "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                    "details.plotAreaM2"
                                  )}
                                />
                              </label>
                            ) : null}
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.heating}
                              </span>
                              <select
                                value={propertyDraft.details.heating}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "heating",
                                    event.target.value as HeatingType
                                  )
                                }
                                className={withChangedFieldClass(
                                  "w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500",
                                  "details.heating"
                                )}
                              >
                                {heatingOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {heatingLabels[siteLanguage][option.value]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      ) : null}

                      {!showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.72fr)_minmax(0,0.4fr)_minmax(0,0.4fr)]">
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.propertyType}
                          </span>
                          <select
                            value={propertyDraft.details.propertyType}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "propertyType",
                                event.target.value as PropertyType
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {extendedPropertyTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {localizedPropertyTypeLabels[option.value]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {isLandProperty ? adminT.landAreaM2 : adminT.areaM2}
                          </span>
                          <input
                            value={propertyDraft.areaM2}
                            onChange={(event) =>
                              setDraftValue("areaM2", toNumber(event.target.value))
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.bedrooms}
                            </span>
                            <input
                              value={propertyDraft.bedrooms}
                              onChange={(event) =>
                                setDraftValue("bedrooms", toNumber(event.target.value))
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.bathrooms}
                            </span>
                            <input
                              value={propertyDraft.bathrooms}
                              onChange={(event) =>
                                setDraftValue("bathrooms", toNumber(event.target.value))
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        </div>
                      ) : null}

                      {!showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.5fr)]">
                        {!isLandProperty ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.condition}
                            </span>
                            <select
                              value={propertyDraft.details.condition}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "condition",
                                  event.target.value as PropertyCondition
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            >
                              {propertyConditionOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {conditionLabels[siteLanguage][option.value]}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {showsResidentialFields ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.parkingSpaces}
                            </span>
                            <input
                              value={propertyDraft.details.parkingSpaces}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "parkingSpaces",
                                  toNumber(event.target.value)
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        {!isLandProperty ? (
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.yearBuilt}
                            </span>
                            <input
                              value={propertyDraft.details.yearBuilt}
                              onChange={(event) =>
                                setDraftDetailsValue("yearBuilt", toNumber(event.target.value))
                              }
                              className="h-11 w-full min-w-0 max-w-[120px] rounded-2xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        ) : null}
                        </div>
                      ) : null}

                      {showsSecondaryAreaFields && !showsCompactLayout ? (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
                          <label className="min-w-0 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Полезная площадь, м²
                            </span>
                            <input
                              value={propertyDraft.details.usableAreaM2}
                              onChange={(event) =>
                                setDraftDetailsValue(
                                  "usableAreaM2",
                                  toNumber(event.target.value)
                                )
                              }
                              className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          {!isLandProperty ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Площадь застройки, м²
                              </span>
                              <input
                                value={propertyDraft.details.builtAreaM2}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "builtAreaM2",
                                    toNumber(event.target.value)
                                  )
                                }
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                          {showsPlotAreaField ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.plotArea}
                              </span>
                              <input
                                value={displayDraftNumberValue(propertyDraft.details.plotAreaM2 ?? 0, isNewPropertyDraft)}
                                onChange={(event) =>
                                  setDraftDetailsValue(
                                    "plotAreaM2",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                          {!isLandProperty ? (
                            <label className="min-w-0 grid gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                {adminT.floor}
                              </span>
                              <input
                                value={propertyDraft.details.floor ?? ""}
                                onChange={(event) =>
                                  setDraftDetailsValue("floor", event.target.value)
                                }
                                className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </label>
                          ) : null}
                        </div>
                      ) : null}

                      <div className={showsResidentialFields && !showsCompactLayout ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.72fr)_minmax(0,0.9fr)_minmax(0,0.6fr)]" : "hidden"}>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.heating}
                          </span>
                          <select
                            value={propertyDraft.details.heating}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "heating",
                                event.target.value as HeatingType
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {heatingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {heatingLabels[siteLanguage][option.value]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.energyClass}
                          </span>
                          <select
                            value={propertyDraft.details.energyRating}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "energyRating",
                                event.target.value as EnergyRating
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {energyRatingOptions.map((rating) => (
                              <option key={rating} value={rating}>
                                {rating}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.orientation}
                          </span>
                          <input
                            value={(activePropertyContent?.orientation ?? []).join(", ")}
                            onChange={(event) =>
                              setLocalizedDraftValue(
                                "orientation",
                                parseOrientationValue(event.target.value)
                              )
                            }
                            placeholder={adminT.orientationPlaceholder}
                            className={withChangedFieldClass(
                              "w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500",
                              getLocalizedContentPath(
                                propertyDraft,
                                adminContentLocale,
                                "orientation"
                              )
                            )}
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.buildingFloors}
                          </span>
                          <input
                            value={propertyDraft.details.buildingFloors ?? 0}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "buildingFloors",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 max-w-[120px] rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                      </div>

                      <div className={showsResidentialFields && !showsCompactLayout ? "grid gap-4 md:grid-cols-2 2xl:grid-cols-[repeat(4,minmax(0,0.58fr))]" : "hidden"}>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Полных ванных
                          </span>
                          <input
                            value={propertyDraft.details.bathroomsFull}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "bathroomsFull",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Гостевых санузлов
                          </span>
                          <input
                            value={propertyDraft.details.guestBathrooms ?? 0}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "guestBathrooms",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.balconies}
                          </span>
                          <input
                            value={propertyDraft.details.balconyCount}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "balconyCount",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                        <label className="min-w-0 grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            Террас
                          </span>
                          <input
                            value={propertyDraft.details.terraceCount}
                            onChange={(event) =>
                              setDraftDetailsValue(
                                "terraceCount",
                                toNumber(event.target.value)
                              )
                            }
                            className="w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">{adminT.features}</div>
                        <div className={featureGridClass}>
                          {visibleFeatureOptions.map((feature) => (
                            <label
                              key={`${feature.source}-${feature.value}`}
                              className={withChangedBlockClass(
                                `inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-700 ${
                                  showsCompactLayout
                                    ? "px-3 py-2 text-[13px]"
                                    : "px-4 py-3 text-sm"
                                }`,
                                isFeatureOptionChanged(feature)
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isFeatureOptionChecked(feature)}
                                onChange={() => toggleFeatureOption(feature)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                              />
                              {feature.source === "feature"
                                ? localizedFeatureLabels[feature.value]
                                : localizedFeatureLabels[feature.value]}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">
                            {adminT.transportAccess}
                          </div>
                          <button
                            type="button"
                            onClick={addTransportRoute}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                          >
                            {adminT.addRoute}
                          </button>
                        </div>
                        <div className="grid gap-2">
                          {propertyDraft.transportAccess.map((route, index) => (
                            <div
                              key={`transport-route-${index}`}
                              className={withChangedBlockClass(
                                "grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 lg:grid-cols-[0.82fr_0.96fr_1fr_0.92fr_auto]",
                                isTransportRouteChanged(index)
                              )}
                            >
                              <select
                                value={route.mode}
                                onChange={(event) =>
                                  setDraftTransportValue(
                                    index,
                                    "mode",
                                    event.target.value as TransportMode
                                  )
                                }
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.mode`
                                )}
                              >
                                {transportModeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {transportModeLabels[siteLanguage][option.value]}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={route.route}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "route", event.target.value)
                                }
                                placeholder="726, 728, 731"
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.route`
                                )}
                              />
                              <input
                                type="text"
                                value={route.stopName}
                                onChange={(event) =>
                                  setDraftTransportValue(index, "stopName", event.target.value)
                                }
                                placeholder={adminT.stop}
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.stopName`
                                )}
                              />
                              <input
                                value={route.walkMinutes}
                                onChange={(event) =>
                                  setDraftTransportValue(
                                    index,
                                    "walkMinutes",
                                    toNumber(event.target.value)
                                  )
                                }
                                placeholder={adminT.walkTime}
                                className={withChangedFieldClass(
                                  "h-10 rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500",
                                  `transportAccess.${index}.walkMinutes`
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeTransportRoute(index)}
                                className="h-10 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
                              >
                                {adminT.delete}
                              </button>
                            </div>
                          ))}
                          {propertyDraft.transportAccess.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                              {adminT.noRoutes}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {adminT.currentPhotos}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {adminT.reorderPhotosHelp}
                            </div>
                          </div>
                          {renderCollapseButton("photos")}
                        </div>
                        {!isSectionCollapsed("photos") ? (
                        <>
                        <div
                          className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-3"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void handleMainGalleryDrop(event);
                          }}
                        >
                          {propertyDraft.imageGallery.length > 0 ? (
                            propertyDraft.imageGallery.map((imageUrl, index) => {
                              const imageScale =
                                propertyDraft.imagePositions?.[imageUrl]?.scale ?? 100;

                              return (
                              <div
                                key={imageUrl}
                                draggable
                                onDragStart={(event) =>
                                  writeGalleryDragData(event, imageUrl, "main")
                                }
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.stopPropagation();
                                  void handleMainGalleryDrop(event, imageUrl);
                                }}
                                className={withChangedBlockClass(
                                  `w-[280px] shrink-0 cursor-grab overflow-hidden rounded-2xl border bg-white active:cursor-grabbing sm:w-[300px] ${
                                    propertyDraft.imageUrl === imageUrl
                                      ? "border-amber-400 ring-2 ring-amber-200"
                                      : "border-slate-200"
                                  }`,
                                  isGalleryImageChanged(imageUrl, index)
                                )}
                              >
                                <div className="relative overflow-hidden">
                                  <img
                                    src={imageUrl}
                                    alt={propertyDraft.title}
                                    className="h-40 w-full object-cover"
                                    style={getPropertyImageStyle(propertyDraft, imageUrl)}
                                  />
                                  <div className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">
                                    {index + 1}
                                  </div>
                                  {propertyDraft.imageUrl === imageUrl ? (
                                    <div className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                                      {adminT.cover}
                                    </div>
                                  ) : null}
                                  {isAiGeneratedImage(imageUrl) ? (
                                    <div className="absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                      AI
                                    </div>
                                  ) : null}
                                  <div className="absolute bottom-2 left-1/2 grid -translate-x-1/2 grid-cols-4 gap-0.5 rounded-xl bg-slate-950/20 p-1 text-white opacity-45 shadow-sm transition hover:bg-slate-950/45 hover:opacity-100">
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вверх"
                                      aria-label="Сдвинуть фото вверх"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "y", -2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ↑
                                    </button>
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Увеличить масштаб"
                                      aria-label="Увеличить масштаб"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        nudgeGalleryImageScale(imageUrl, 5);
                                      }}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото влево"
                                      aria-label="Сдвинуть фото влево"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "x", -2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ←
                                    </button>
                                    <span className="grid h-6 w-6 select-none place-items-center text-[9px] font-bold leading-none text-white/90">
                                      {imageScale}
                                    </span>
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вправо"
                                      aria-label="Сдвинуть фото вправо"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "x", 2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      →
                                    </button>
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Уменьшить масштаб"
                                      aria-label="Уменьшить масштаб"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        nudgeGalleryImageScale(imageUrl, -5);
                                      }}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      −
                                    </button>
                                    <span />
                                    <button
                                      type="button"
                                      draggable={false}
                                      title="Сдвинуть фото вниз"
                                      aria-label="Сдвинуть фото вниз"
                                      onPointerDown={(event) =>
                                        startImageNudge(event, imageUrl, "y", 2)
                                      }
                                      onPointerUp={stopImageNudge}
                                      onPointerCancel={stopImageNudge}
                                      onPointerLeave={stopImageNudge}
                                      onClick={(event) => event.preventDefault()}
                                      className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                    >
                                      ↓
                                    </button>
                                    <span />
                                  </div>
                                </div>
                                <div className="p-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCoverImage(imageUrl)}
                                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                        propertyDraft.imageUrl === imageUrl
                                          ? "border-amber-200 bg-amber-50 text-amber-800"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
                                      }`}
                                    >
                                      {propertyDraft.imageUrl === imageUrl
                                        ? adminT.currentCover
                                        : adminT.makeCover}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              );
                            })
                          ) : (
                            <div className="min-w-[260px] rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                              {adminT.noPhotos}
                            </div>
                          )}
                        </div>
                        <div
                          className="mt-4 min-w-0 border-t border-slate-200 pt-4"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void handleSpareGalleryDrop(event);
                          }}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">
                              {adminT.spareGallery}
                            </div>
                            <div className="text-xs text-slate-500">
                              {adminT.spareGalleryHelp}
                            </div>
                          </div>
                          {spareGalleryItems.length > 0 ? (
                            <div className="flex max-w-full gap-3 overflow-x-auto pb-2">
                              {spareGalleryItems.map((item) => (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(event) =>
                                    writeGalleryDragData(event, item.imageUrl, "spare")
                                  }
                                  className="group w-[108px] shrink-0 cursor-grab overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200 active:cursor-grabbing"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void addImageFromSpareToGallery(item.imageUrl);
                                    }}
                                    title="Перенести в основную галерею"
                                    className="relative block h-[66px] w-full cursor-grab active:cursor-grabbing"
                                  >
                                    {item.source === "ai" ? (
                                      <span className="absolute bottom-1 left-1 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                                        AI
                                      </span>
                                    ) : null}
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                  <div className="flex justify-center gap-2 px-1 py-1.5">
                                    <button
                                      type="button"
                                      title="Скачать"
                                      aria-label="Скачать"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void downloadImageToComputer(item.imageUrl, `${item.id}.jpg`);
                                      }}
                                      className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                                        <path
                                          d="M12 3v10.2m0 0 3.6-3.6M12 13.2 8.4 9.6M5 16.5V20h14v-3.5"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      title="Удалить"
                                      aria-label="Удалить"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void deleteImageFromSpareGallery(item.imageUrl);
                                      }}
                                      className="grid h-7 w-7 place-items-center rounded-full border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                                        <path
                                          d="M4 7h16M10 11v6m4-6v6M9 7l.5-3h5L15 7m-8 0 1 13h8l1-13"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                              {adminT.spareGalleryEmpty}
                            </div>
                          )}
                          <label className="mt-4 grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.photoUpload}
                            </span>
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
                              <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:flex-wrap md:justify-start">
                                <button
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                  }}
                                  onClick={() => {
                                    openPhotoPicker();
                                  }}
                                  className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  {adminT.chooseFiles}
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                  }}
                                  onClick={() => {
                                    openCameraPicker();
                                  }}
                                  className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 md:hidden"
                                >
                                  {adminT.takePhoto}
                                </button>
                                <span className="hidden text-sm text-slate-600 md:inline">
                                  {uploadedPhotos.length > 0
                                    ? `${adminT.uploadedCount}: ${uploadedPhotos.length}`
                                    : adminT.uploadHelp}
                                </span>
                                <input
                                  ref={photoFileInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handlePhotoUpload}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                                />
                                <input
                                  ref={cameraPhotoInputRef}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handlePhotoUpload}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                                />
                              </div>
                            </div>
                          </label>
                        </div>
                        </>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Выберите объект слева или создайте новый.
                    </div>
                  )
                  ) : null}
                </div>

                <div className="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:block">
                  <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">
                        {adminT.photosAiTitle}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {adminT.photosAiHelp}
                      </div>
                    </div>
                    {renderCollapseButton("ai")}
                  </div>

                  {!isSectionCollapsed("ai") ? (
                  <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
                    <div className="grid self-start gap-4">
                      <div className="grid gap-2">
                        <div className="text-sm font-semibold text-slate-800">
                          {adminT.aiSources}
                        </div>
                        <div
                          className="min-h-[132px] rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={handleAiSourceDrop}
                        >
                          {aiSourcePhotos.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                              {aiSourcePhotos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="w-[132px] shrink-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
                                >
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.name}
                                    className="h-20 w-full object-cover"
                                  />
                                  <div className="grid gap-2 p-2">
                                    <select
                                      value={photo.roomType}
                                      onChange={(event) =>
                                        setAiSourceRoomType(
                                          photo.id,
                                          event.target.value as RoomType
                                        )
                                      }
                                      className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-emerald-500"
                                    >
                                      {roomTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {localizedRoomTypeLabels[siteLanguage][option.value]}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => removeAiSourcePhoto(photo.imageUrl)}
                                      className="rounded-xl border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-700"
                                    >
                                      {adminT.remove}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[96px] items-center justify-center text-center text-sm text-slate-500">
                              {adminT.aiDropSource}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-1">
                        <label className="grid gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {adminT.palette}
                          </span>
                          <select
                            value={aiPalette}
                            onChange={(event) =>
                              setAiPalette(
                                event.target.value as (typeof paletteOptions)[number]["value"]
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            {paletteOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {paletteLabels[siteLanguage][option.value]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <button
                          type="button"
                          onClick={generateAiVariants}
                          disabled={isGeneratingAi}
                          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isGeneratingAi ? (
                            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                          ) : null}
                          <span className="min-w-0 break-words">
                            {isGeneratingAi && currentAiPhotoName
                              ? `Обрабатываю фото: ${currentAiPhotoName}`
                              : isGeneratingAi
                                ? adminT.generatingVariant
                                : adminT.generateFurniture}
                          </span>
                        </button>
                        {isGeneratingAi ? (
                          <button
                            type="button"
                            onClick={cancelAiGeneration}
                            className="min-h-14 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
                          >
                            Прервать
                          </button>
                        ) : null}
                      </div>

                      {aiStatus ? (
                        <div
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            /ошиб|лимит|квот|не удалось|превыш/i.test(aiStatus)
                              ? "border-red-100 bg-red-50 text-red-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {aiStatus}
                        </div>
                      ) : null}

                      {currentAiUsageEstimate ? (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                          <div className="font-semibold">
                            {formatAiGenerationCost(currentAiUsageEstimate)}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
                        <div className="font-semibold">
                          {adminT.generationBalance}: {formatEur(generationBalance.totalCostEur ?? usdToEur(generationBalance.totalCostUsd))}
                        </div>
                        <div className="mt-1 text-xs text-emerald-900/80">
                          {adminT.tokens}: {generationBalance.totalTokens.toLocaleString("ru-RU")}
                          {" "}· {adminT.images}: {generationBalance.totalImages}
                          {" "}· {adminT.records}: {generationBalance.entriesCount}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {uploadedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex gap-3">
                              <img
                                src={photo.previewUrl}
                                alt={photo.name}
                                className="h-24 w-24 rounded-2xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                                  {photo.name}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                                  <div className="text-sm text-slate-600">
                                    {adminT.photoSavedToSpare}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid self-start gap-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="text-sm font-semibold text-slate-800">
                          {adminT.generatedVariant}
                        </div>
                        {hasAiGeneratedResult ? (
                          <button
                            type="button"
                            onClick={clearAiGeneratedVariants}
                            disabled={isGeneratingAi}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {adminT.clearGeneratedVariant}
                          </button>
                        ) : null}
                      </div>
                      {visibleAiVariants.length > 0 ? (
                        <div className="grid gap-4">
                          {visibleAiVariants.map((variant) => (
                            <article
                              key={variant.photoImageUrl}
                              draggable
                              onDragStart={(event) =>
                                writeGalleryDragData(event, variant.photoImageUrl, "ai-result")
                              }
                              className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm cursor-grab active:cursor-grabbing"
                            >
                              <div className="relative">
                                <span className="absolute bottom-3 left-3 z-10 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                  AI
                                </span>
                                <img
                                  src={variant.photoImageUrl}
                                  alt={variant.title}
                                  draggable={false}
                                  onDragStart={(event) => {
                                    event.preventDefault();
                                  }}
                                  className="h-[320px] w-full cursor-grab object-cover active:cursor-grabbing"
                                />
                              </div>
                              <div className="grid gap-3 p-4">
                                <div>
                                  <div className="text-base font-semibold text-slate-950">
                                    {variant.title}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-600">
                                    {adminT.dragImageToGallery}
                                  </div>
                                </div>
                                {aiResult?.usageEstimate ? (
                                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                    {formatAiGenerationCost(aiResult.usageEstimate)}
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadImageToComputer(
                                      variant.photoImageUrl,
                                      `${variant.id}.jpg`
                                    )
                                  }
                                  className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  {adminT.download}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                          {adminT.aiResultPlaceholder}
                        </div>
                      )}
                    </div>
                  </div>
                  ) : null}
                </div>

                <div className="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:block">
                  <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">
                        {adminT.gifTitle}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {adminT.gifHelp}
                      </div>
                    </div>
                    {renderCollapseButton("gif")}
                  </div>

                  {!isSectionCollapsed("gif") ? (
                    <div className="grid gap-5 xl:grid-cols-[500px_minmax(340px,1fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                      <div className="grid min-w-0 gap-4 xl:max-w-[500px] 2xl:max-w-none">
                        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:gap-4">
                          {([
                            ["start", adminT.startPhoto, gifStartImageUrl],
                            ["finish", adminT.finishPhoto, gifFinishImageUrl],
                          ] as Array<[GifImageSlot, string, string]>).map(
                            ([slot, label, imageUrl]) => {
                              const frameSettings = getGifFrameSettings(slot);

                              return (
                                <div key={slot} className="grid min-w-0 gap-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-800">
                                      {label}
                                    </div>
                                    {imageUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => clearGifImageSlot(slot)}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-800"
                                      >
                                        {adminT.reset}
                                      </button>
                                    ) : null}
                                  </div>
                                  <div
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => handleGifImageDrop(event, slot)}
                                    className="relative flex h-[126px] w-full min-w-0 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500 lg:h-[150px] xl:h-[126px] 2xl:h-auto 2xl:aspect-[3/2] 2xl:min-h-[190px] 2xl:text-sm"
                                  >
                                    {imageUrl ? (
                                      <>
                                        <img
                                          src={imageUrl}
                                          alt={label}
                                          draggable={false}
                                          className="h-full w-full object-cover"
                                          style={{
                                            objectPosition: `${frameSettings.x}% ${frameSettings.y}%`,
                                          }}
                                        />
                                        <div className="absolute right-2 top-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-950/10 p-1 text-white">
                                          <span />
                                          <button
                                            type="button"
                                            draggable={false}
                                            title="Сдвинуть фото вверх"
                                            aria-label="Сдвинуть фото вверх"
                                            onPointerDown={(event) =>
                                              startGifFrameNudge(event, slot, "y", -2)
                                            }
                                            onPointerUp={stopImageNudge}
                                            onPointerCancel={stopImageNudge}
                                            onPointerLeave={stopImageNudge}
                                            onClick={(event) => event.preventDefault()}
                                            className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                          >
                                            ↑
                                          </button>
                                          <span />
                                          <button
                                            type="button"
                                            draggable={false}
                                            title="Сдвинуть фото влево"
                                            aria-label="Сдвинуть фото влево"
                                            onPointerDown={(event) =>
                                              startGifFrameNudge(event, slot, "x", -2)
                                            }
                                            onPointerUp={stopImageNudge}
                                            onPointerCancel={stopImageNudge}
                                            onPointerLeave={stopImageNudge}
                                            onClick={(event) => event.preventDefault()}
                                            className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                          >
                                            ←
                                          </button>
                                          <button
                                            type="button"
                                            draggable={false}
                                            title="Сбросить позицию"
                                            aria-label="Сбросить позицию"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              resetGifFrameSettings(slot);
                                            }}
                                            className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-[10px] font-bold transition hover:bg-white/35"
                                          >
                                            •
                                          </button>
                                          <button
                                            type="button"
                                            draggable={false}
                                            title="Сдвинуть фото вправо"
                                            aria-label="Сдвинуть фото вправо"
                                            onPointerDown={(event) =>
                                              startGifFrameNudge(event, slot, "x", 2)
                                            }
                                            onPointerUp={stopImageNudge}
                                            onPointerCancel={stopImageNudge}
                                            onPointerLeave={stopImageNudge}
                                            onClick={(event) => event.preventDefault()}
                                            className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                          >
                                            →
                                          </button>
                                          <span />
                                          <button
                                            type="button"
                                            draggable={false}
                                            title="Сдвинуть фото вниз"
                                            aria-label="Сдвинуть фото вниз"
                                            onPointerDown={(event) =>
                                              startGifFrameNudge(event, slot, "y", 2)
                                            }
                                            onPointerUp={stopImageNudge}
                                            onPointerCancel={stopImageNudge}
                                            onPointerLeave={stopImageNudge}
                                            onClick={(event) => event.preventDefault()}
                                            className="grid h-6 w-6 touch-none select-none place-items-center rounded-full bg-white/10 text-xs font-bold transition hover:bg-white/35"
                                          >
                                            ↓
                                          </button>
                                          <span />
                                        </div>
                                      </>
                                    ) : (
                                      <span className="px-5">
                                        {adminT.aiDropSource}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.startSeconds}
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifStartSeconds}
                              onChange={(event) =>
                                setGifStartSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.transitionSeconds}
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifTransitionSeconds}
                              onChange={(event) =>
                                setGifTransitionSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              {adminT.finishSeconds}
                            </span>
                            <input
                              type="number"
                              min="0.2"
                              max="10"
                              step="0.1"
                              value={gifFinishSeconds}
                              onChange={(event) =>
                                setGifFinishSeconds(Number(event.target.value))
                              }
                              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={generateTransitionGif}
                          disabled={isGeneratingGif}
                          className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isGeneratingGif ? adminT.generatingGif : adminT.generateGif}
                        </button>

                        {gifStatus ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {gifStatus}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid min-w-0 self-start gap-3">
                        <div className="text-sm font-semibold text-slate-800">
                          {adminT.readyGif}
                        </div>
                        {gifResult ? (
                          <div
                            draggable
                            onDragStart={(event) =>
                              writeGalleryDragData(event, gifResult.gifUrl, "gif-result")
                            }
                            className="cursor-grab overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm active:cursor-grabbing"
                          >
                            <img
                              src={gifResult.gifUrl}
                              alt={adminT.gifTitle}
                              draggable={false}
                              onDragStart={(event) => {
                                event.preventDefault();
                              }}
                              className="h-[320px] w-full object-cover"
                            />
                            <div className="grid gap-3 p-4">
                              <div className="text-sm text-slate-600">
                                <div>Размер: {formatBytes(gifResult.sizeBytes)}</div>
                                <div>Стоимость генерации: {formatEur(usdToEur(gifResult.estimatedCostUsd))}</div>
                                <div className="text-xs text-slate-500">{gifResult.note}</div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                  {adminT.spareGalleryHelp}
                                </div>
                                <a
                                  href={gifResult.gifUrl}
                                  download
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  {adminT.download} GIF
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">                            
                            {adminT.gifPlaceholder}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
        ) : activeTab === "inquiries" ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm 2xl:min-h-0 2xl:overflow-y-auto">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-950">
                {adminT.clientInquiriesTitle}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {adminT.inquiriesHelp}
              </div>
            </div>

            <div className="grid gap-4">
              {inquiries.length > 0 ? (
                inquiries.map((inquiry) => {
                  const linkedUser = inquiry.userId
                    ? usersById.get(inquiry.userId) ?? null
                    : null;
                  const visibleInquiryEmail = inquiry.email ?? linkedUser?.email ?? null;

                  return (
                    <article
                      key={inquiry.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {inquiry.source === "property_request"
                            ? adminT.propertyInquiry
                            : adminT.generalInquiry}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {new Date(inquiry.createdAt).toLocaleString("ru-RU")}
                        </div>
                      </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {linkedUser ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(linkedUser.id);
                                setActiveTab("users");
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              {adminT.openUser}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              updateInquiryStatus(
                                inquiry.id,
                                inquiry.status === "new" ? "reviewed" : "new"
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              inquiry.status === "new"
                                ? "border border-amber-300 bg-amber-50 text-amber-900"
                                : "border border-emerald-300 bg-emerald-50 text-emerald-900"
                            }`}
                          >
                            {inquiry.status === "new"
                              ? adminT.markReviewed
                              : adminT.returnToNew}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteInquiry(inquiry.id);
                            }}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                          >
                            {adminT.deleteInquiry}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                          <div>
                            <span className="font-semibold">{adminT.phone}:</span> {inquiry.phone}
                          </div>
                          {visibleInquiryEmail ? (
                            <div className="mt-1">
                              <span className="font-semibold">Email:</span> {visibleInquiryEmail}
                            </div>
                          ) : null}
                          <div className="mt-1">
                            <span className="font-semibold">{adminT.messengers}:</span>{" "}
                            {inquiry.messengers.join(", ") || "-"}
                          </div>
                          {inquiry.name ? (
                            <div className="mt-1">
                              <span className="font-semibold">{adminT.name}:</span> {inquiry.name}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                          {linkedUser ? (
                            <div>
                              <span className="font-semibold">{adminT.user}:</span>{" "}
                              {linkedUser.email}
                            </div>
                          ) : null}
                          {inquiry.propertyTitle ? (
                            <div className={linkedUser ? "mt-1" : undefined}>
                              <span className="font-semibold">{adminT.property}:</span>{" "}
                              {inquiry.propertyTitle}
                            </div>
                          ) : null}
                          {inquiry.location ? (
                            <div className="mt-1">
                              <span className="font-semibold">{adminT.location}:</span>{" "}
                              {inquiry.location}
                            </div>
                          ) : null}
                          {inquiry.areaAndTypology ? (
                            <div className="mt-1">
                              <span className="font-semibold">{adminT.areaTypology}:</span>{" "}
                              {inquiry.areaAndTypology}
                            </div>
                          ) : null}
                          {inquiry.searchType ? (
                            <div className="mt-1">
                              <span className="font-semibold">{adminT.need}:</span>{" "}
                              {inquiry.searchType}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {inquiry.message ? (
                        <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                          <span className="font-semibold">{adminT.message}:</span> {inquiry.message}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {adminT.noInquiries}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="grid flex-1 items-start gap-6 2xl:min-h-0 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:items-stretch">
            <aside className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm 2xl:min-h-0">
              <div className="mb-3 text-sm font-semibold text-slate-950">
                {adminT.registeredUsers}: {users.length}
              </div>
              <div className="grid content-start gap-3 pr-1 2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto">
                {users.map((user) => {
                  const isActive = user.id === selectedUserId;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                          {user.email}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {adminT.registration}: {formatAdminDate(user.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="grid content-start gap-6 pr-1 2xl:h-full 2xl:min-h-0 2xl:overflow-y-auto">
              {selectedUser ? (
                <>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-semibold text-slate-950">
                          {selectedUser.email}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {adminT.siteUser}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {adminT.lastActivity}: {formatAdminDate(selectedUser.lastActiveAt)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteSelectedUser();
                          }}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          {adminT.deleteUser}
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Email
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-950">
                          {selectedUser.email}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {adminT.registration}
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-950">
                          {formatAdminDate(selectedUser.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-lg font-semibold text-slate-950">
                        {adminT.favorites}
                      </div>
                      <div className="grid gap-3">
                        {getPropertiesByIds(selectedUser.favoriteIds).map((property) => {
                          const localizedProperty = getPropertyDisplayContentForLocale(
                            property,
                            siteLanguage
                          );

                          return (
                            <div
                              key={`favorite-${property.id}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-base font-semibold text-slate-950">
                                    {localizedProperty.content.title}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {localizedProperty.content.city} · {property.priceLabel}
                                  </div>
                                </div>
                                <a
                                  href={getPropertyPublicPath(property)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  {adminT.openCard}
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-lg font-semibold text-slate-950">
                        {adminT.compareList}
                      </div>
                      <div className="grid gap-3">
                        {getPropertiesByIds(selectedUser.compareIds).map((property) => {
                          const localizedProperty = getPropertyDisplayContentForLocale(
                            property,
                            siteLanguage
                          );

                          return (
                            <div
                              key={`compare-${property.id}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-base font-semibold text-slate-950">
                                    {localizedProperty.content.title}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {localizedProperty.content.city} · {property.priceLabel}
                                  </div>
                                </div>
                                <a
                                  href={getPropertyPublicPath(property)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  {adminT.openCard}
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {adminT.noUsers}
                </div>
              )}
            </section>
          </section>
        )}

        {isJsonEditorOpen && propertyDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">
                    JSON редактор объекта
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Редактируется только текущий объект: {getPropertyDisplayId(propertyDraft)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800">
                    Импорт JSON
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Экспорт JSON
                  </button>
                  <button
                    type="button"
                    onClick={saveJsonEditor}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Сохранить JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsJsonEditorOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    Закрыть
                  </button>
                </div>
              </div>

              <textarea
                value={jsonEditorValue}
                onChange={(event) => setJsonEditorValue(event.target.value)}
                className="min-h-[68vh] w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-500"
                spellCheck={false}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
