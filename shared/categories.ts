import additionalCategoryLabels from './category-translations.json';
import type {Locale} from './domain';
import {normalizeSearch} from './search';

// Canonical values also match the English input-sheet categories. Labels alone are translated.
export const categories=[
  'Emotional Family Stories',
  'Relationship Drama and Betrayal',
  'Mystery and Hidden Secrets',
  'Unexpected Life Events',
  'Moral Dilemmas',
  'Inspirational and Heartwarming Stories',
  'Psychological Stories and Plot Twists',
  'Pet and Animal Stories',
] as const;
export type Category=typeof categories[number];
type Labels=readonly string[];
const fr:Labels=['Histoires familiales émouvantes','Drames relationnels et trahisons','Mystères et secrets cachés','Événements de vie inattendus','Dilemmes moraux','Histoires inspirantes et réconfortantes','Histoires psychologiques et rebondissements','Histoires d’animaux et de compagnons'];
const de:Labels=['Emotionale Familiengeschichten','Beziehungsdramen und Verrat','Mysterien und verborgene Geheimnisse','Unerwartete Lebensereignisse','Moralische Dilemmata','Inspirierende und herzerwärmende Geschichten','Psychologische Geschichten und überraschende Wendungen','Haustier- und Tiergeschichten'];
const nl:Labels=['Ontroerende familieverhalen','Relatiedrama en verraad','Mysteries en verborgen geheimen','Onverwachte levensgebeurtenissen','Morele dilemma’s','Inspirerende en hartverwarmende verhalen','Psychologische verhalen en verrassende wendingen','Verhalen over huisdieren en dieren'];
export const categoryLabels:Record<Locale,Labels>={
  ...additionalCategoryLabels,
  en:categories,
  vi:['Câu chuyện gia đình cảm động','Bi kịch tình cảm và sự phản bội','Bí ẩn và những bí mật ẩn giấu','Biến cố bất ngờ trong cuộc sống','Những tình huống khó xử về đạo đức','Câu chuyện truyền cảm hứng và ấm áp','Câu chuyện tâm lý và những cú ngoặt bất ngờ','Câu chuyện về thú cưng và động vật'],
  fr,de,nl,'fr-BE':fr,'de-BE':de,'nl-BE':nl,
  es:['Historias familiares emotivas','Dramas de pareja y traición','Misterios y secretos ocultos','Acontecimientos inesperados de la vida','Dilemas morales','Historias inspiradoras y reconfortantes','Historias psicológicas y giros inesperados','Historias de mascotas y animales'],
  it:['Storie familiari emozionanti','Drammi sentimentali e tradimenti','Misteri e segreti nascosti','Eventi di vita inaspettati','Dilemmi morali','Storie ispiratrici che scaldano il cuore','Storie psicologiche e colpi di scena','Storie di animali e animali domestici'],
  pt:['Histórias de família emocionantes','Dramas de relacionamento e traição','Mistérios e segredos ocultos','Acontecimentos inesperados da vida','Dilemas morais','Histórias inspiradoras e comoventes','Histórias psicológicas e reviravoltas','Histórias de animais e de estimação'],
  pl:['Wzruszające historie rodzinne','Dramaty w związkach i zdrada','Tajemnice i ukryte sekrety','Nieoczekiwane wydarzenia życiowe','Dylematy moralne','Inspirujące i pokrzepiające historie','Historie psychologiczne i zwroty akcji','Historie o zwierzętach i pupilach'],
  da:['Rørende familiehistorier','Parforholdsdrama og svigt','Mysterier og skjulte hemmeligheder','Uventede livsbegivenheder','Moralske dilemmaer','Inspirerende og hjertevarme historier','Psykologiske historier og overraskende drejninger','Historier om kæledyr og dyr'],
  sv:['Gripande familjeberättelser','Relationsdrama och svek','Mysterier och dolda hemligheter','Oväntade livshändelser','Moraliska dilemman','Inspirerande och hjärtevärmande berättelser','Psykologiska berättelser och oväntade vändningar','Berättelser om husdjur och djur'],
};
const lookup=new Map<string,Category>();
for(const labels of Object.values(categoryLabels))labels.forEach((label,index)=>lookup.set(normalizeSearch(label),categories[index]));
export function categoryValue(value:string){return lookup.get(normalizeSearch(value))||value;}
export function categoryAliases(value:string){const canonical=categoryValue(value),index=categories.findIndex(c=>c===canonical);return index<0?[value]:[...new Set(Object.values(categoryLabels).map(labels=>labels[index]))];}
export function translatedCategory(value:string,locale:Locale){const canonical=categoryValue(value),index=categories.findIndex(c=>c===canonical);return index<0?undefined:categoryLabels[locale][index];}
