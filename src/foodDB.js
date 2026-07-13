// База продуктов: значения на 100 г (ккал, белки, жиры, углеводы).
// Значения — усреднённые справочные. Можно расширять.
// CALORIZATOR — выверенные generic-продукты (справочные значения Calorizator.ru), приоритет выше OFF.
// GENERATED — большая база из Open Food Facts (бренды/продукты), добавляется в конец.
import { CALORIZATOR } from './foodDB.calorizator';
import { GENERATED } from './foodDB.generated';

export const CURATED = [
  // Каши / гарниры (варёные)
  { name: 'Гречка варёная', aliases: ['гречка', 'гречневая каша', 'гречневая'], per100: { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21 } },
  { name: 'Рис варёный', aliases: ['рис', 'рисовая каша'], per100: { kcal: 116, protein: 2.2, fat: 0.5, carbs: 25 } },
  { name: 'Овсянка на воде', aliases: ['овсянка', 'овсяная каша', 'геркулес'], per100: { kcal: 88, protein: 3, fat: 1.7, carbs: 15 } },
  { name: 'Овсянка на молоке', aliases: ['овсянка на молоке'], per100: { kcal: 120, protein: 4.5, fat: 4.2, carbs: 16 } },
  { name: 'Пшённая каша', aliases: ['пшёнка', 'пшенка', 'пшённая'], per100: { kcal: 90, protein: 3, fat: 0.8, carbs: 17 } },
  { name: 'Макароны варёные', aliases: ['макароны', 'паста', 'спагетти'], per100: { kcal: 112, protein: 3.5, fat: 0.4, carbs: 23 } },
  { name: 'Картофель варёный', aliases: ['картошка варёная', 'картофель', 'картошка'], per100: { kcal: 82, protein: 2, fat: 0.4, carbs: 17 } },
  { name: 'Картофель жареный', aliases: ['жареная картошка', 'картошка жареная'], per100: { kcal: 192, protein: 2.8, fat: 9.5, carbs: 23 } },
  { name: 'Картофельное пюре', aliases: ['пюре'], per100: { kcal: 106, protein: 2.1, fat: 3.3, carbs: 16 } },
  { name: 'Булгур варёный', aliases: ['булгур'], per100: { kcal: 83, protein: 3, fat: 0.2, carbs: 18 } },
  { name: 'Киноа варёная', aliases: ['киноа', 'кинуа'], per100: { kcal: 120, protein: 4.4, fat: 1.9, carbs: 21 } },

  // Мясо / птица / рыба
  { name: 'Куриная грудка варёная', aliases: ['куриная грудка', 'курица варёная', 'грудка'], per100: { kcal: 137, protein: 29, fat: 1.8, carbs: 0 } },
  { name: 'Куриная грудка жареная', aliases: ['курица жареная', 'жареная курица'], per100: { kcal: 197, protein: 30, fat: 8, carbs: 0 } },
  { name: 'Курица (бедро)', aliases: ['куриное бедро', 'бедро'], per100: { kcal: 185, protein: 21, fat: 11, carbs: 0 } },
  { name: 'Говядина варёная', aliases: ['говядина', 'мясо говядина'], per100: { kcal: 254, protein: 25, fat: 16, carbs: 0 } },
  { name: 'Свинина', aliases: ['свинина'], per100: { kcal: 297, protein: 22, fat: 23, carbs: 0 } },
  { name: 'Индейка', aliases: ['индейка', 'филе индейки'], per100: { kcal: 130, protein: 21, fat: 5, carbs: 0 } },
  { name: 'Фарш говяжий', aliases: ['фарш'], per100: { kcal: 254, protein: 17, fat: 20, carbs: 0 } },
  { name: 'Котлета', aliases: ['котлета', 'котлеты'], per100: { kcal: 250, protein: 15, fat: 18, carbs: 8 } },
  { name: 'Лосось', aliases: ['лосось', 'сёмга', 'семга'], per100: { kcal: 208, protein: 20, fat: 13, carbs: 0 } },
  { name: 'Тунец', aliases: ['тунец'], per100: { kcal: 130, protein: 24, fat: 4, carbs: 0 } },
  { name: 'Треска', aliases: ['треска', 'белая рыба'], per100: { kcal: 78, protein: 18, fat: 0.7, carbs: 0 } },
  { name: 'Минтай', aliases: ['минтай'], per100: { kcal: 72, protein: 16, fat: 0.9, carbs: 0 } },
  { name: 'Креветки', aliases: ['креветки'], per100: { kcal: 95, protein: 20, fat: 1.5, carbs: 0 } },

  // Яйца / молочка
  { name: 'Яйцо куриное', aliases: ['яйцо', 'яйца', 'варёное яйцо'], per100: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 } },
  { name: 'Омлет', aliases: ['омлет', 'яичница'], per100: { kcal: 184, protein: 10, fat: 15, carbs: 2 } },
  { name: 'Творог 5%', aliases: ['творог', 'творог 5'], per100: { kcal: 121, protein: 17, fat: 5, carbs: 3 } },
  { name: 'Творог обезжиренный', aliases: ['творог обезжиренный', 'творог 0'], per100: { kcal: 71, protein: 16, fat: 0.5, carbs: 1.3 } },
  { name: 'Молоко 2.5%', aliases: ['молоко'], per100: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 } },
  { name: 'Кефир 1%', aliases: ['кефир'], per100: { kcal: 40, protein: 3, fat: 1, carbs: 4 } },
  { name: 'Йогурт натуральный', aliases: ['йогурт', 'греческий йогурт'], per100: { kcal: 66, protein: 5, fat: 3.2, carbs: 3.5 } },
  { name: 'Сыр твёрдый', aliases: ['сыр', 'сыр твёрдый'], per100: { kcal: 363, protein: 25, fat: 29, carbs: 0 } },
  { name: 'Сыр творожный', aliases: ['творожный сыр', 'сливочный сыр'], per100: { kcal: 253, protein: 6, fat: 24, carbs: 3 } },
  { name: 'Сметана 15%', aliases: ['сметана'], per100: { kcal: 160, protein: 2.6, fat: 15, carbs: 3 } },
  { name: 'Масло сливочное', aliases: ['сливочное масло', 'масло'], per100: { kcal: 748, protein: 0.5, fat: 82, carbs: 0.8 } },

  // Хлеб / выпечка
  { name: 'Хлеб белый', aliases: ['белый хлеб', 'батон', 'хлеб'], per100: { kcal: 260, protein: 8, fat: 3, carbs: 49 } },
  { name: 'Хлеб чёрный', aliases: ['чёрный хлеб', 'ржаной хлеб', 'бородинский'], per100: { kcal: 214, protein: 6, fat: 1.2, carbs: 42 } },
  { name: 'Хлебцы', aliases: ['хлебцы'], per100: { kcal: 310, protein: 9, fat: 2, carbs: 63 } },
  { name: 'Тост', aliases: ['тост', 'тост с маслом'], per100: { kcal: 290, protein: 8, fat: 6, carbs: 50 } },
  { name: 'Блины', aliases: ['блины', 'блинчики'], per100: { kcal: 233, protein: 6, fat: 12, carbs: 26 } },
  { name: 'Печенье', aliases: ['печенье'], per100: { kcal: 417, protein: 6, fat: 14, carbs: 68 } },
  { name: 'Круассан', aliases: ['круассан'], per100: { kcal: 406, protein: 8, fat: 21, carbs: 46 } },

  // Овощи
  { name: 'Огурец', aliases: ['огурец', 'огурцы'], per100: { kcal: 15, protein: 0.8, fat: 0.1, carbs: 2.8 } },
  { name: 'Помидор', aliases: ['помидор', 'помидоры', 'томат'], per100: { kcal: 20, protein: 0.9, fat: 0.2, carbs: 3.7 } },
  { name: 'Салат овощной', aliases: ['салат из огурцов', 'овощной салат', 'салат'], per100: { kcal: 40, protein: 1, fat: 2.5, carbs: 4 } },
  { name: 'Капуста', aliases: ['капуста'], per100: { kcal: 28, protein: 1.8, fat: 0.1, carbs: 5 } },
  { name: 'Морковь', aliases: ['морковь', 'морковка'], per100: { kcal: 35, protein: 1.3, fat: 0.1, carbs: 7 } },
  { name: 'Брокколи', aliases: ['брокколи'], per100: { kcal: 34, protein: 2.8, fat: 0.4, carbs: 7 } },
  { name: 'Авокадо', aliases: ['авокадо'], per100: { kcal: 160, protein: 2, fat: 15, carbs: 9 } },

  // Фрукты
  { name: 'Банан', aliases: ['банан', 'бананы'], per100: { kcal: 89, protein: 1.1, fat: 0.3, carbs: 23 } },
  { name: 'Яблоко', aliases: ['яблоко', 'яблоки'], per100: { kcal: 52, protein: 0.3, fat: 0.2, carbs: 14 } },
  { name: 'Апельсин', aliases: ['апельсин'], per100: { kcal: 47, protein: 0.9, fat: 0.1, carbs: 12 } },
  { name: 'Мандарин', aliases: ['мандарин', 'мандарины'], per100: { kcal: 53, protein: 0.8, fat: 0.3, carbs: 13 } },
  { name: 'Виноград', aliases: ['виноград'], per100: { kcal: 69, protein: 0.6, fat: 0.2, carbs: 18 } },
  { name: 'Клубника', aliases: ['клубника'], per100: { kcal: 33, protein: 0.7, fat: 0.3, carbs: 8 } },

  // Орехи / снеки
  { name: 'Грецкие орехи', aliases: ['грецкие орехи', 'орехи'], per100: { kcal: 654, protein: 15, fat: 65, carbs: 14 } },
  { name: 'Миндаль', aliases: ['миндаль'], per100: { kcal: 579, protein: 21, fat: 50, carbs: 22 } },
  { name: 'Арахисовая паста', aliases: ['арахисовая паста'], per100: { kcal: 588, protein: 25, fat: 50, carbs: 20 } },
  { name: 'Шоколад молочный', aliases: ['шоколад', 'молочный шоколад'], per100: { kcal: 535, protein: 8, fat: 30, carbs: 59 } },
  { name: 'Конфета', aliases: ['конфета', 'конфеты'], per100: { kcal: 450, protein: 4, fat: 20, carbs: 65 } },
  { name: 'Мёд', aliases: ['мёд', 'мед'], per100: { kcal: 329, protein: 0.8, fat: 0, carbs: 81 } },
  { name: 'Сахар', aliases: ['сахар'], per100: { kcal: 399, protein: 0, fat: 0, carbs: 100 } },

  // Напитки
  { name: 'Кофе с молоком', aliases: ['кофе с молоком', 'капучино', 'латте'], per100: { kcal: 40, protein: 2, fat: 1.5, carbs: 4 } },
  { name: 'Кофе чёрный', aliases: ['кофе', 'эспрессо', 'американо'], per100: { kcal: 2, protein: 0.1, fat: 0, carbs: 0 } },
  { name: 'Чай без сахара', aliases: ['чай'], per100: { kcal: 1, protein: 0, fat: 0, carbs: 0 } },
  { name: 'Сок апельсиновый', aliases: ['сок', 'апельсиновый сок'], per100: { kcal: 45, protein: 0.7, fat: 0.2, carbs: 10 } },
  { name: 'Кола', aliases: ['кола', 'газировка'], per100: { kcal: 42, protein: 0, fat: 0, carbs: 10.6 } },

  // Масла / прочее
  { name: 'Масло растительное', aliases: ['растительное масло', 'подсолнечное масло', 'оливковое масло'], per100: { kcal: 899, protein: 0, fat: 100, carbs: 0 } },
  { name: 'Суп овощной', aliases: ['суп', 'овощной суп'], per100: { kcal: 40, protein: 1.5, fat: 1.5, carbs: 5 } },
  { name: 'Борщ', aliases: ['борщ'], per100: { kcal: 49, protein: 1.5, fat: 2.5, carbs: 5 } },
  { name: 'Пельмени', aliases: ['пельмени'], per100: { kcal: 275, protein: 12, fat: 12, carbs: 29 } },
  { name: 'Пицца', aliases: ['пицца'], per100: { kcal: 266, protein: 11, fat: 10, carbs: 33 } },
  { name: 'Суши / ролл', aliases: ['суши', 'роллы', 'ролл'], per100: { kcal: 150, protein: 5, fat: 4, carbs: 24 } },

  // Каши / крупы (доп)
  { name: 'Манная каша', aliases: ['манка', 'манная'], per100: { kcal: 98, protein: 3, fat: 3.2, carbs: 15 } },
  { name: 'Перловка варёная', aliases: ['перловка', 'перловая'], per100: { kcal: 106, protein: 2.3, fat: 0.4, carbs: 23 } },
  { name: 'Кукурузная каша', aliases: ['кукурузная каша', 'полента'], per100: { kcal: 86, protein: 2, fat: 0.6, carbs: 18 } },
  { name: 'Чечевица варёная', aliases: ['чечевица'], per100: { kcal: 116, protein: 9, fat: 0.4, carbs: 20 } },
  { name: 'Фасоль варёная', aliases: ['фасоль'], per100: { kcal: 123, protein: 8, fat: 0.5, carbs: 21 } },
  { name: 'Нут варёный', aliases: ['нут', 'хумус основа'], per100: { kcal: 164, protein: 9, fat: 2.6, carbs: 27 } },
  { name: 'Мюсли', aliases: ['мюсли', 'гранола'], per100: { kcal: 352, protein: 9, fat: 6, carbs: 66 } },

  // Мясо / рыба (доп)
  { name: 'Бекон', aliases: ['бекон'], per100: { kcal: 500, protein: 37, fat: 40, carbs: 1 } },
  { name: 'Колбаса варёная', aliases: ['колбаса', 'докторская'], per100: { kcal: 257, protein: 12, fat: 22, carbs: 1.5 } },
  { name: 'Сосиски', aliases: ['сосиски', 'сосиска'], per100: { kcal: 266, protein: 11, fat: 24, carbs: 2 } },
  { name: 'Ветчина', aliases: ['ветчина'], per100: { kcal: 145, protein: 18, fat: 8, carbs: 0.5 } },
  { name: 'Печень куриная', aliases: ['куриная печень', 'печень'], per100: { kcal: 137, protein: 20, fat: 6, carbs: 1 } },
  { name: 'Сельдь', aliases: ['селёдка', 'сельдь'], per100: { kcal: 246, protein: 17, fat: 19, carbs: 0 } },
  { name: 'Скумбрия', aliases: ['скумбрия'], per100: { kcal: 191, protein: 18, fat: 13, carbs: 0 } },
  { name: 'Крабовые палочки', aliases: ['крабовые палочки', 'краб палочки'], per100: { kcal: 88, protein: 6, fat: 1, carbs: 14 } },
  { name: 'Тофу', aliases: ['тофу'], per100: { kcal: 76, protein: 8, fat: 4.8, carbs: 1.9 } },

  // Молочка / сыры (доп)
  { name: 'Сыр моцарелла', aliases: ['моцарелла'], per100: { kcal: 280, protein: 22, fat: 22, carbs: 2 } },
  { name: 'Сыр фета', aliases: ['фета', 'брынза'], per100: { kcal: 265, protein: 14, fat: 21, carbs: 4 } },
  { name: 'Сыр пармезан', aliases: ['пармезан'], per100: { kcal: 392, protein: 36, fat: 26, carbs: 3 } },
  { name: 'Сырок глазированный', aliases: ['глазированный сырок', 'сырок'], per100: { kcal: 407, protein: 8, fat: 27, carbs: 32 } },
  { name: 'Ряженка', aliases: ['ряженка'], per100: { kcal: 54, protein: 3, fat: 2.5, carbs: 4 } },
  { name: 'Сливки 10%', aliases: ['сливки'], per100: { kcal: 118, protein: 3, fat: 10, carbs: 4 } },
  { name: 'Мороженое', aliases: ['мороженое', 'пломбир'], per100: { kcal: 227, protein: 3.7, fat: 14, carbs: 22 } },

  // Овощи / фрукты (доп)
  { name: 'Перец болгарский', aliases: ['перец', 'болгарский перец'], per100: { kcal: 27, protein: 1, fat: 0.2, carbs: 5 } },
  { name: 'Лук репчатый', aliases: ['лук'], per100: { kcal: 41, protein: 1.4, fat: 0.2, carbs: 9 } },
  { name: 'Свёкла варёная', aliases: ['свёкла', 'свекла'], per100: { kcal: 44, protein: 1.7, fat: 0.2, carbs: 9 } },
  { name: 'Кукуруза', aliases: ['кукуруза'], per100: { kcal: 96, protein: 3.4, fat: 1.5, carbs: 19 } },
  { name: 'Горошек зелёный', aliases: ['горошек', 'зелёный горошек'], per100: { kcal: 81, protein: 5, fat: 0.4, carbs: 14 } },
  { name: 'Кабачок', aliases: ['кабачок', 'цукини'], per100: { kcal: 24, protein: 1.2, fat: 0.3, carbs: 4.6 } },
  { name: 'Баклажан', aliases: ['баклажан'], per100: { kcal: 25, protein: 1, fat: 0.2, carbs: 6 } },
  { name: 'Грибы', aliases: ['грибы', 'шампиньоны'], per100: { kcal: 27, protein: 4.3, fat: 1, carbs: 1 } },
  { name: 'Груша', aliases: ['груша'], per100: { kcal: 57, protein: 0.4, fat: 0.1, carbs: 15 } },
  { name: 'Персик', aliases: ['персик'], per100: { kcal: 39, protein: 0.9, fat: 0.3, carbs: 9.5 } },
  { name: 'Киви', aliases: ['киви'], per100: { kcal: 61, protein: 1.1, fat: 0.5, carbs: 15 } },
  { name: 'Черника', aliases: ['черника', 'голубика'], per100: { kcal: 57, protein: 0.7, fat: 0.3, carbs: 14 } },
  { name: 'Малина', aliases: ['малина'], per100: { kcal: 52, protein: 1.2, fat: 0.7, carbs: 12 } },
  { name: 'Арбуз', aliases: ['арбуз'], per100: { kcal: 30, protein: 0.6, fat: 0.2, carbs: 8 } },
  { name: 'Дыня', aliases: ['дыня'], per100: { kcal: 34, protein: 0.8, fat: 0.2, carbs: 8 } },
  { name: 'Финики', aliases: ['финики'], per100: { kcal: 282, protein: 2.5, fat: 0.4, carbs: 75 } },
  { name: 'Изюм', aliases: ['изюм'], per100: { kcal: 299, protein: 3, fat: 0.5, carbs: 79 } },
  { name: 'Курага', aliases: ['курага', 'сухофрукты'], per100: { kcal: 241, protein: 3.4, fat: 0.5, carbs: 63 } },

  // Орехи / снеки (доп)
  { name: 'Кешью', aliases: ['кешью'], per100: { kcal: 553, protein: 18, fat: 44, carbs: 30 } },
  { name: 'Фундук', aliases: ['фундук', 'лесной орех'], per100: { kcal: 628, protein: 15, fat: 61, carbs: 17 } },
  { name: 'Арахис', aliases: ['арахис'], per100: { kcal: 567, protein: 26, fat: 49, carbs: 16 } },
  { name: 'Семечки', aliases: ['семечки', 'семена подсолнечника'], per100: { kcal: 584, protein: 21, fat: 51, carbs: 20 } },
  { name: 'Чипсы', aliases: ['чипсы'], per100: { kcal: 536, protein: 7, fat: 35, carbs: 53 } },
  { name: 'Сухарики', aliases: ['сухарики'], per100: { kcal: 400, protein: 11, fat: 12, carbs: 62 } },
  { name: 'Попкорн', aliases: ['попкорн'], per100: { kcal: 375, protein: 11, fat: 4, carbs: 78 } },
  { name: 'Зефир', aliases: ['зефир'], per100: { kcal: 326, protein: 0.8, fat: 0, carbs: 80 } },
  { name: 'Мармелад', aliases: ['мармелад'], per100: { kcal: 321, protein: 0, fat: 0.1, carbs: 79 } },
  { name: 'Халва', aliases: ['халва'], per100: { kcal: 523, protein: 12, fat: 30, carbs: 54 } },
  { name: 'Торт', aliases: ['торт'], per100: { kcal: 350, protein: 5, fat: 18, carbs: 43 } },
  { name: 'Пончик', aliases: ['пончик', 'донат'], per100: { kcal: 452, protein: 6, fat: 25, carbs: 51 } },
  { name: 'Вафли', aliases: ['вафли'], per100: { kcal: 430, protein: 8, fat: 20, carbs: 56 } },
  { name: 'Пряник', aliases: ['пряник', 'пряники'], per100: { kcal: 350, protein: 5, fat: 7, carbs: 68 } },
  { name: 'Сгущёнка', aliases: ['сгущёнка', 'сгущенка'], per100: { kcal: 320, protein: 7, fat: 8.5, carbs: 55 } },
  { name: 'Джем', aliases: ['джем', 'варенье', 'повидло'], per100: { kcal: 265, protein: 0.4, fat: 0.1, carbs: 65 } },
  { name: 'Нутелла', aliases: ['нутелла', 'шоколадная паста'], per100: { kcal: 539, protein: 6, fat: 31, carbs: 57 } },

  // Фастфуд / готовые блюда (доп)
  { name: 'Бургер', aliases: ['бургер', 'гамбургер', 'чизбургер'], per100: { kcal: 250, protein: 12, fat: 12, carbs: 22 } },
  { name: 'Картофель фри', aliases: ['фри', 'картошка фри'], per100: { kcal: 312, protein: 3.4, fat: 15, carbs: 41 } },
  { name: 'Шаурма', aliases: ['шаурма', 'шаверма'], per100: { kcal: 215, protein: 12, fat: 11, carbs: 17 } },
  { name: 'Хот-дог', aliases: ['хот-дог', 'хотдог'], per100: { kcal: 247, protein: 10, fat: 15, carbs: 18 } },
  { name: 'Наггетсы', aliases: ['наггетсы', 'нагетсы'], per100: { kcal: 296, protein: 15, fat: 19, carbs: 16 } },
  { name: 'Плов', aliases: ['плов'], per100: { kcal: 190, protein: 8, fat: 8, carbs: 22 } },
  { name: 'Гуляш', aliases: ['гуляш'], per100: { kcal: 148, protein: 12, fat: 9, carbs: 4 } },
  { name: 'Голубцы', aliases: ['голубцы'], per100: { kcal: 118, protein: 6, fat: 7, carbs: 8 } },
  { name: 'Вареники с картошкой', aliases: ['вареники'], per100: { kcal: 190, protein: 5, fat: 4, carbs: 33 } },
  { name: 'Сырники', aliases: ['сырники'], per100: { kcal: 220, protein: 12, fat: 10, carbs: 20 } },
  { name: 'Оладьи', aliases: ['оладьи'], per100: { kcal: 210, protein: 5, fat: 7, carbs: 32 } },
  { name: 'Запеканка творожная', aliases: ['запеканка'], per100: { kcal: 170, protein: 14, fat: 6, carbs: 15 } },
  { name: 'Суп куриный', aliases: ['куриный суп', 'бульон'], per100: { kcal: 36, protein: 3, fat: 1.5, carbs: 2.5 } },
  { name: 'Салат Цезарь', aliases: ['цезарь'], per100: { kcal: 190, protein: 9, fat: 15, carbs: 5 } },
  { name: 'Салат Оливье', aliases: ['оливье'], per100: { kcal: 198, protein: 5, fat: 15, carbs: 10 } },
  { name: 'Винегрет', aliases: ['винегрет'], per100: { kcal: 76, protein: 1.5, fat: 4.5, carbs: 7 } },

  // Соусы / напитки (доп)
  { name: 'Майонез', aliases: ['майонез'], per100: { kcal: 627, protein: 1, fat: 67, carbs: 3 } },
  { name: 'Кетчуп', aliases: ['кетчуп'], per100: { kcal: 112, protein: 1.5, fat: 0.2, carbs: 26 } },
  { name: 'Соевый соус', aliases: ['соевый соус'], per100: { kcal: 53, protein: 8, fat: 0, carbs: 5 } },
  { name: 'Протеиновый батончик', aliases: ['протеиновый батончик', 'батончик'], per100: { kcal: 350, protein: 30, fat: 12, carbs: 35 } },
  { name: 'Протеин (порошок)', aliases: ['протеин', 'сывороточный протеин'], per100: { kcal: 375, protein: 75, fat: 5, carbs: 8 } },
  { name: 'Смузи', aliases: ['смузи'], per100: { kcal: 60, protein: 1, fat: 0.3, carbs: 14 } },
  { name: 'Компот', aliases: ['компот'], per100: { kcal: 60, protein: 0.2, fat: 0, carbs: 15 } },
  { name: 'Вино', aliases: ['вино'], per100: { kcal: 83, protein: 0.1, fat: 0, carbs: 2.6 } },
  { name: 'Пиво', aliases: ['пиво'], per100: { kcal: 43, protein: 0.5, fat: 0, carbs: 3.6 } },
  { name: 'Энергетик', aliases: ['энергетик'], per100: { kcal: 45, protein: 0, fat: 0, carbs: 11 } },

  // === Расширение базы ===
  // Крупы / гарниры
  { name: 'Рис бурый варёный', aliases: ['бурый рис', 'коричневый рис'], per100: { kcal: 111, protein: 2.6, fat: 0.9, carbs: 23 } },
  { name: 'Кускус варёный', aliases: ['кускус'], per100: { kcal: 112, protein: 3.8, fat: 0.2, carbs: 23 } },
  { name: 'Ячневая каша', aliases: ['ячневая', 'ячка'], per100: { kcal: 96, protein: 2.3, fat: 0.3, carbs: 20 } },
  { name: 'Кукурузные хлопья', aliases: ['кукурузные хлопья', 'корнфлекс'], per100: { kcal: 357, protein: 7, fat: 1, carbs: 83 } },
  { name: 'Сухой завтрак', aliases: ['сухой завтрак', 'хлопья', 'колечки'], per100: { kcal: 380, protein: 8, fat: 4, carbs: 80 } },
  { name: 'Гранола', aliases: ['гранола запечённая'], per100: { kcal: 471, protein: 10, fat: 20, carbs: 64 } },

  // Мясо / птица
  { name: 'Баранина', aliases: ['баранина'], per100: { kcal: 294, protein: 17, fat: 25, carbs: 0 } },
  { name: 'Кролик', aliases: ['кролик', 'крольчатина'], per100: { kcal: 156, protein: 21, fat: 8, carbs: 0 } },
  { name: 'Стейк говяжий', aliases: ['стейк', 'рибай'], per100: { kcal: 271, protein: 25, fat: 19, carbs: 0 } },
  { name: 'Шашлык свиной', aliases: ['шашлык', 'шашлык из свинины'], per100: { kcal: 280, protein: 20, fat: 22, carbs: 0 } },
  { name: 'Куриные крылья', aliases: ['крылья', 'крылышки'], per100: { kcal: 210, protein: 19, fat: 15, carbs: 0 } },
  { name: 'Куриная голень', aliases: ['голень', 'куриная ножка', 'ножка'], per100: { kcal: 175, protein: 20, fat: 10, carbs: 0 } },
  { name: 'Сало', aliases: ['сало', 'шпик'], per100: { kcal: 797, protein: 2.4, fat: 89, carbs: 0 } },
  { name: 'Буженина', aliases: ['буженина', 'карбонад'], per100: { kcal: 233, protein: 15, fat: 19, carbs: 1 } },
  { name: 'Тефтели', aliases: ['тефтели', 'фрикадельки'], per100: { kcal: 200, protein: 12, fat: 12, carbs: 10 } },

  // Рыба / морепродукты
  { name: 'Форель', aliases: ['форель'], per100: { kcal: 141, protein: 20, fat: 6.6, carbs: 0 } },
  { name: 'Горбуша', aliases: ['горбуша'], per100: { kcal: 140, protein: 21, fat: 6, carbs: 0 } },
  { name: 'Хек', aliases: ['хек'], per100: { kcal: 86, protein: 16, fat: 2.2, carbs: 0 } },
  { name: 'Карп', aliases: ['карп'], per100: { kcal: 112, protein: 16, fat: 5, carbs: 0 } },
  { name: 'Кальмар', aliases: ['кальмар', 'кальмары'], per100: { kcal: 92, protein: 18, fat: 2.2, carbs: 0 } },
  { name: 'Мидии', aliases: ['мидии'], per100: { kcal: 77, protein: 11, fat: 2, carbs: 3 } },
  { name: 'Икра красная', aliases: ['икра', 'красная икра'], per100: { kcal: 250, protein: 32, fat: 13, carbs: 0 } },
  { name: 'Рыбные палочки', aliases: ['рыбные палочки'], per100: { kcal: 250, protein: 12, fat: 14, carbs: 19 } },

  // Яйца / молочка
  { name: 'Яичница-глазунья', aliases: ['яичница', 'глазунья'], per100: { kcal: 196, protein: 13, fat: 15, carbs: 1 } },
  { name: 'Молоко 3.2%', aliases: ['молоко 3.2', 'цельное молоко'], per100: { kcal: 60, protein: 2.9, fat: 3.2, carbs: 4.7 } },
  { name: 'Айран', aliases: ['айран', 'тан'], per100: { kcal: 30, protein: 1.7, fat: 1.5, carbs: 2.5 } },
  { name: 'Простокваша', aliases: ['простокваша', 'снежок'], per100: { kcal: 58, protein: 2.9, fat: 2.5, carbs: 4.1 } },
  { name: 'Сыр адыгейский', aliases: ['адыгейский', 'адыгейский сыр'], per100: { kcal: 240, protein: 19, fat: 18, carbs: 1.5 } },
  { name: 'Сыр российский', aliases: ['российский сыр', 'сыр российский'], per100: { kcal: 363, protein: 23, fat: 30, carbs: 0 } },
  { name: 'Сыр плавленый', aliases: ['плавленый сыр', 'плавленный сыр'], per100: { kcal: 290, protein: 10, fat: 25, carbs: 4 } },
  { name: 'Масса творожная', aliases: ['творожная масса'], per100: { kcal: 340, protein: 7, fat: 23, carbs: 27 } },

  // Овощи / зелень
  { name: 'Редис', aliases: ['редис', 'редиска'], per100: { kcal: 19, protein: 1.2, fat: 0.1, carbs: 3.4 } },
  { name: 'Чеснок', aliases: ['чеснок'], per100: { kcal: 143, protein: 6.5, fat: 0.5, carbs: 30 } },
  { name: 'Зелень', aliases: ['укроп', 'петрушка', 'зелень', 'зелёный лук'], per100: { kcal: 36, protein: 3, fat: 0.5, carbs: 6 } },
  { name: 'Шпинат', aliases: ['шпинат', 'руккола'], per100: { kcal: 23, protein: 2.9, fat: 0.4, carbs: 3.6 } },
  { name: 'Тыква', aliases: ['тыква'], per100: { kcal: 26, protein: 1, fat: 0.1, carbs: 6.5 } },
  { name: 'Стручковая фасоль', aliases: ['стручковая фасоль', 'спаржевая фасоль'], per100: { kcal: 31, protein: 1.8, fat: 0.1, carbs: 5.7 } },
  { name: 'Оливки', aliases: ['оливки', 'маслины'], per100: { kcal: 145, protein: 1, fat: 15, carbs: 4 } },
  { name: 'Квашеная капуста', aliases: ['квашеная капуста', 'кислая капуста'], per100: { kcal: 19, protein: 1.8, fat: 0.1, carbs: 4.4 } },
  { name: 'Помидоры черри', aliases: ['черри', 'помидоры черри'], per100: { kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 } },

  // Фрукты / ягоды
  { name: 'Слива', aliases: ['слива', 'сливы'], per100: { kcal: 46, protein: 0.7, fat: 0.3, carbs: 11 } },
  { name: 'Абрикос', aliases: ['абрикос', 'абрикосы'], per100: { kcal: 48, protein: 1.4, fat: 0.4, carbs: 9 } },
  { name: 'Гранат', aliases: ['гранат'], per100: { kcal: 83, protein: 1.7, fat: 1.2, carbs: 19 } },
  { name: 'Ананас', aliases: ['ананас'], per100: { kcal: 50, protein: 0.5, fat: 0.1, carbs: 13 } },
  { name: 'Манго', aliases: ['манго'], per100: { kcal: 60, protein: 0.8, fat: 0.4, carbs: 15 } },
  { name: 'Хурма', aliases: ['хурма'], per100: { kcal: 67, protein: 0.5, fat: 0.4, carbs: 15 } },
  { name: 'Вишня', aliases: ['вишня', 'черешня'], per100: { kcal: 52, protein: 0.8, fat: 0.2, carbs: 11 } },
  { name: 'Смородина', aliases: ['смородина'], per100: { kcal: 44, protein: 1, fat: 0.2, carbs: 8 } },
  { name: 'Грейпфрут', aliases: ['грейпфрут'], per100: { kcal: 35, protein: 0.7, fat: 0.2, carbs: 8 } },
  { name: 'Лимон', aliases: ['лимон'], per100: { kcal: 29, protein: 0.9, fat: 0.1, carbs: 3 } },
  { name: 'Чернослив', aliases: ['чернослив'], per100: { kcal: 231, protein: 2.3, fat: 0.4, carbs: 57 } },
  { name: 'Фисташки', aliases: ['фисташки'], per100: { kcal: 560, protein: 20, fat: 45, carbs: 28 } },
  { name: 'Кедровые орехи', aliases: ['кедровые орехи', 'кедровый орех'], per100: { kcal: 673, protein: 14, fat: 68, carbs: 13 } },

  // Хлеб / выпечка
  { name: 'Лаваш', aliases: ['лаваш', 'тонкий лаваш'], per100: { kcal: 275, protein: 9, fat: 1, carbs: 56 } },
  { name: 'Багет', aliases: ['багет', 'французский батон'], per100: { kcal: 262, protein: 9, fat: 3, carbs: 50 } },
  { name: 'Булочка', aliases: ['булочка', 'сдоба', 'булка'], per100: { kcal: 300, protein: 8, fat: 7, carbs: 52 } },
  { name: 'Бублик', aliases: ['бублик', 'бейгл'], per100: { kcal: 276, protein: 9, fat: 1.5, carbs: 55 } },
  { name: 'Маффин', aliases: ['маффин', 'кекс', 'капкейк'], per100: { kcal: 380, protein: 6, fat: 18, carbs: 50 } },
  { name: 'Чизкейк', aliases: ['чизкейк'], per100: { kcal: 321, protein: 6, fat: 22, carbs: 26 } },
  { name: 'Эклер', aliases: ['эклер', 'профитроль'], per100: { kcal: 360, protein: 6, fat: 24, carbs: 30 } },
  { name: 'Пирожок печёный', aliases: ['пирожок', 'пирог'], per100: { kcal: 270, protein: 6, fat: 9, carbs: 40 } },
  { name: 'Ватрушка', aliases: ['ватрушка'], per100: { kcal: 295, protein: 8, fat: 9, carbs: 45 } },
  { name: 'Крекеры', aliases: ['крекеры', 'крекер', 'галеты'], per100: { kcal: 430, protein: 9, fat: 14, carbs: 66 } },
  { name: 'Сушки', aliases: ['сушки', 'баранки'], per100: { kcal: 331, protein: 11, fat: 1.3, carbs: 68 } },

  // Готовые блюда / супы
  { name: 'Лазанья', aliases: ['лазанья'], per100: { kcal: 165, protein: 9, fat: 8, carbs: 14 } },
  { name: 'Ризотто', aliases: ['ризотто'], per100: { kcal: 160, protein: 4, fat: 5, carbs: 24 } },
  { name: 'Драники', aliases: ['драники', 'картофельные оладьи'], per100: { kcal: 180, protein: 3, fat: 9, carbs: 22 } },
  { name: 'Манты', aliases: ['манты'], per100: { kcal: 220, protein: 10, fat: 11, carbs: 20 } },
  { name: 'Хачапури', aliases: ['хачапури'], per100: { kcal: 300, protein: 11, fat: 16, carbs: 28 } },
  { name: 'Чебурек', aliases: ['чебурек', 'беляш'], per100: { kcal: 265, protein: 8, fat: 15, carbs: 24 } },
  { name: 'Солянка', aliases: ['солянка'], per100: { kcal: 65, protein: 4, fat: 4, carbs: 3 } },
  { name: 'Щи', aliases: ['щи'], per100: { kcal: 40, protein: 1.5, fat: 2, carbs: 4 } },
  { name: 'Гороховый суп', aliases: ['гороховый суп', 'суп гороховый'], per100: { kcal: 66, protein: 4, fat: 2, carbs: 8 } },
  { name: 'Грибной суп', aliases: ['грибной суп'], per100: { kcal: 50, protein: 2, fat: 3, carbs: 4 } },
  { name: 'Уха', aliases: ['уха', 'рыбный суп'], per100: { kcal: 46, protein: 4, fat: 2, carbs: 2.5 } },
  { name: 'Окрошка', aliases: ['окрошка'], per100: { kcal: 60, protein: 3, fat: 3, carbs: 5 } },
  { name: 'Рагу овощное', aliases: ['рагу', 'овощное рагу'], per100: { kcal: 80, protein: 2, fat: 4, carbs: 9 } },

  // Фастфуд / снеки
  { name: 'Сэндвич', aliases: ['сэндвич', 'сендвич', 'панини'], per100: { kcal: 250, protein: 10, fat: 12, carbs: 26 } },
  { name: 'Буррито', aliases: ['буррито', 'тако', 'кесадилья'], per100: { kcal: 220, protein: 9, fat: 9, carbs: 26 } },
  { name: 'Лапша быстрого приготовления', aliases: ['доширак', 'роллтон', 'лапша быстрого', 'бомж пакет'], per100: { kcal: 440, protein: 10, fat: 20, carbs: 55 } },
  { name: 'Картофельные дольки', aliases: ['дольки', 'картофельные дольки', 'айдахо'], per100: { kcal: 230, protein: 3, fat: 12, carbs: 28 } },
  { name: 'Луковые кольца', aliases: ['луковые кольца'], per100: { kcal: 330, protein: 4, fat: 19, carbs: 36 } },

  // Соусы / сладкое
  { name: 'Горчица', aliases: ['горчица'], per100: { kcal: 143, protein: 9, fat: 8, carbs: 8 } },
  { name: 'Аджика', aliases: ['аджика', 'ткемали'], per100: { kcal: 59, protein: 1, fat: 2, carbs: 9 } },
  { name: 'Песто', aliases: ['песто'], per100: { kcal: 450, protein: 5, fat: 45, carbs: 6 } },
  { name: 'Хумус', aliases: ['хумус'], per100: { kcal: 166, protein: 8, fat: 10, carbs: 14 } },
  { name: 'Шоколадный батончик', aliases: ['сникерс', 'марс', 'твикс', 'шоколадный батончик'], per100: { kcal: 490, protein: 7, fat: 24, carbs: 60 } },
  { name: 'Карамель', aliases: ['карамель', 'леденец', 'леденцы', 'драже'], per100: { kcal: 375, protein: 0, fat: 0.2, carbs: 93 } },
  { name: 'Пастила', aliases: ['пастила', 'щербет'], per100: { kcal: 310, protein: 0.5, fat: 0, carbs: 80 } },
  { name: 'Козинак', aliases: ['козинак', 'грильяж'], per100: { kcal: 470, protein: 12, fat: 28, carbs: 45 } },
  { name: 'Тирамису', aliases: ['тирамису', 'десерт'], per100: { kcal: 300, protein: 5, fat: 20, carbs: 25 } },

  // Напитки
  { name: 'Какао с молоком', aliases: ['какао', 'горячий шоколад'], per100: { kcal: 78, protein: 3, fat: 3, carbs: 10 } },
  { name: 'Молочный коктейль', aliases: ['молочный коктейль', 'милкшейк'], per100: { kcal: 110, protein: 3.5, fat: 3, carbs: 18 } },
  { name: 'Квас', aliases: ['квас'], per100: { kcal: 27, protein: 0.2, fat: 0, carbs: 5 } },
  { name: 'Морс', aliases: ['морс', 'лимонад'], per100: { kcal: 40, protein: 0.1, fat: 0, carbs: 10 } },
  { name: 'Минеральная вода', aliases: ['минералка', 'минеральная вода', 'вода'], per100: { kcal: 0, protein: 0, fat: 0, carbs: 0 } },
  { name: 'Шампанское', aliases: ['шампанское', 'игристое'], per100: { kcal: 88, protein: 0.2, fat: 0, carbs: 3 } },
  { name: 'Виски', aliases: ['виски', 'коньяк', 'водка'], per100: { kcal: 250, protein: 0, fat: 0, carbs: 0 } },

  // === Расширение базы 2 ===
  // Крупы / гарниры / завтраки
  { name: 'Каша рисовая молочная', aliases: ['рисовая каша на молоке', 'рисовая молочная'], per100: { kcal: 97, protein: 2.5, fat: 3, carbs: 16 } },
  { name: 'Каша манная молочная', aliases: ['манная каша на молоке', 'манная молочная'], per100: { kcal: 100, protein: 3, fat: 3.3, carbs: 15 } },
  { name: 'Овсяноблин', aliases: ['овсяноблин', 'овсяноблинчик'], per100: { kcal: 165, protein: 11, fat: 8, carbs: 12 } },
  { name: 'Вермишель варёная', aliases: ['вермишель', 'лапша варёная'], per100: { kcal: 112, protein: 3.5, fat: 0.4, carbs: 23 } },
  { name: 'Фунчоза', aliases: ['фунчоза', 'стеклянная лапша'], per100: { kcal: 90, protein: 0.2, fat: 0, carbs: 22 } },

  // Молочка
  { name: 'Творог 9%', aliases: ['творог 9'], per100: { kcal: 159, protein: 16, fat: 9, carbs: 2 } },
  { name: 'Йогурт греческий 2%', aliases: ['греческий йогурт 2', 'греческий 2'], per100: { kcal: 66, protein: 9, fat: 2, carbs: 3.6 } },
  { name: 'Йогурт питьевой', aliases: ['питьевой йогурт', 'активиа'], per100: { kcal: 72, protein: 2.8, fat: 1.5, carbs: 12 } },
  { name: 'Сыр сулугуни', aliases: ['сулугуни'], per100: { kcal: 286, protein: 20, fat: 24, carbs: 0 } },
  { name: 'Сыр косичка', aliases: ['косичка', 'чечил'], per100: { kcal: 320, protein: 20, fat: 26, carbs: 2 } },
  { name: 'Молоко овсяное', aliases: ['овсяное молоко'], per100: { kcal: 45, protein: 1, fat: 1.5, carbs: 7 } },
  { name: 'Молоко кокосовое (напиток)', aliases: ['кокосовое молоко напиток'], per100: { kcal: 30, protein: 0.2, fat: 2, carbs: 3 } },

  // Мясо / рыба
  { name: 'Куриный фарш', aliases: ['куриный фарш', 'фарш куриный'], per100: { kcal: 143, protein: 17, fat: 8, carbs: 0 } },
  { name: 'Люля-кебаб', aliases: ['люля-кебаб', 'люля кебаб'], per100: { kcal: 260, protein: 15, fat: 22, carbs: 1 } },
  { name: 'Салями', aliases: ['салями', 'сервелат'], per100: { kcal: 425, protein: 21, fat: 38, carbs: 1 } },
  { name: 'Грудинка', aliases: ['грудинка', 'корейка'], per100: { kcal: 466, protein: 10, fat: 47, carbs: 0 } },
  { name: 'Дорадо', aliases: ['дорадо', 'сибас'], per100: { kcal: 96, protein: 18, fat: 3, carbs: 0 } },
  { name: 'Судак', aliases: ['судак', 'щука', 'окунь речной'], per100: { kcal: 84, protein: 19, fat: 0.8, carbs: 0 } },
  { name: 'Осьминог', aliases: ['осьминог', 'гребешки'], per100: { kcal: 82, protein: 15, fat: 1, carbs: 2 } },

  // Готовые блюда
  { name: 'Паста карбонара', aliases: ['карбонара', 'паста карбонара'], per100: { kcal: 250, protein: 9, fat: 13, carbs: 24 } },
  { name: 'Паста болоньезе', aliases: ['болоньезе', 'спагетти болоньезе'], per100: { kcal: 160, protein: 8, fat: 6, carbs: 18 } },
  { name: 'Бефстроганов', aliases: ['бефстроганов', 'бефстроганов из говядины'], per100: { kcal: 180, protein: 14, fat: 12, carbs: 4 } },
  { name: 'Мясо по-французски', aliases: ['мясо по-французски', 'мясо по французски'], per100: { kcal: 220, protein: 13, fat: 16, carbs: 6 } },
  { name: 'Курица гриль', aliases: ['курица гриль', 'гриль курица'], per100: { kcal: 210, protein: 24, fat: 13, carbs: 0 } },
  { name: 'Ролл Филадельфия', aliases: ['филадельфия', 'ролл филадельфия'], per100: { kcal: 210, protein: 8, fat: 9, carbs: 24 } },
  { name: 'Ролл Калифорния', aliases: ['калифорния', 'ролл калифорния'], per100: { kcal: 176, protein: 6, fat: 5, carbs: 26 } },
  { name: 'Том Ям', aliases: ['том ям', 'том-ям'], per100: { kcal: 60, protein: 5, fat: 3, carbs: 3 } },
  { name: 'Греческий салат', aliases: ['греческий салат'], per100: { kcal: 110, protein: 3, fat: 9, carbs: 5 } },
  { name: 'Селёдка под шубой', aliases: ['селёдка под шубой', 'шуба'], per100: { kcal: 200, protein: 6, fat: 16, carbs: 8 } },
  { name: 'Наггетсы куриные', aliases: ['куриные наггетсы'], per100: { kcal: 290, protein: 15, fat: 18, carbs: 16 } },
  { name: 'Овощи гриль', aliases: ['овощи гриль', 'гриль овощи'], per100: { kcal: 60, protein: 1.5, fat: 3, carbs: 7 } },

  // Овощи / фрукты / ягоды
  { name: 'Цветная капуста', aliases: ['цветная капуста'], per100: { kcal: 30, protein: 2.5, fat: 0.3, carbs: 5 } },
  { name: 'Брюссельская капуста', aliases: ['брюссельская капуста'], per100: { kcal: 43, protein: 3.4, fat: 0.3, carbs: 9 } },
  { name: 'Батат', aliases: ['батат', 'сладкий картофель'], per100: { kcal: 86, protein: 1.6, fat: 0.1, carbs: 20 } },
  { name: 'Сельдерей', aliases: ['сельдерей'], per100: { kcal: 16, protein: 0.7, fat: 0.2, carbs: 3 } },
  { name: 'Нектарин', aliases: ['нектарин'], per100: { kcal: 44, protein: 1.1, fat: 0.3, carbs: 10 } },
  { name: 'Папайя', aliases: ['папайя', 'маракуйя'], per100: { kcal: 43, protein: 0.5, fat: 0.3, carbs: 11 } },
  { name: 'Клюква', aliases: ['клюква', 'брусника'], per100: { kcal: 46, protein: 0.4, fat: 0.1, carbs: 12 } },
  { name: 'Ежевика', aliases: ['ежевика'], per100: { kcal: 43, protein: 1.4, fat: 0.5, carbs: 10 } },

  // Выпечка / десерты
  { name: 'Хлеб цельнозерновой', aliases: ['цельнозерновой хлеб', 'зерновой хлеб'], per100: { kcal: 230, protein: 9, fat: 3, carbs: 41 } },
  { name: 'Пита', aliases: ['пита', 'тортилья', 'лепёшка'], per100: { kcal: 275, protein: 9, fat: 2, carbs: 55 } },
  { name: 'Брауни', aliases: ['брауни'], per100: { kcal: 420, protein: 5, fat: 22, carbs: 52 } },
  { name: 'Наполеон', aliases: ['наполеон', 'торт наполеон'], per100: { kcal: 400, protein: 5, fat: 25, carbs: 40 } },
  { name: 'Медовик', aliases: ['медовик', 'торт медовик'], per100: { kcal: 380, protein: 5, fat: 20, carbs: 46 } },
  { name: 'Шарлотка', aliases: ['шарлотка', 'яблочный пирог'], per100: { kcal: 250, protein: 5, fat: 8, carbs: 40 } },
  { name: 'Панкейки', aliases: ['панкейки', 'панкейк'], per100: { kcal: 227, protein: 6, fat: 8, carbs: 33 } },
  { name: 'Печенье овсяное', aliases: ['овсяное печенье'], per100: { kcal: 437, protein: 6, fat: 14, carbs: 71 } },
  { name: 'Пирожное картошка', aliases: ['пирожное картошка', 'картошка пирожное'], per100: { kcal: 310, protein: 5, fat: 12, carbs: 45 } },
  { name: 'Батончик мюсли', aliases: ['батончик мюсли', 'злаковый батончик'], per100: { kcal: 380, protein: 6, fat: 12, carbs: 62 } },

  // Напитки
  { name: 'Раф кофе', aliases: ['раф', 'раф кофе'], per100: { kcal: 90, protein: 2, fat: 6, carbs: 8 } },
  { name: 'Матча латте', aliases: ['матча', 'матча латте'], per100: { kcal: 60, protein: 2, fat: 2.5, carbs: 8 } },
  { name: 'Кисель', aliases: ['кисель'], per100: { kcal: 53, protein: 0.1, fat: 0, carbs: 13 } },
  { name: 'Пепси / Спрайт', aliases: ['пепси', 'спрайт', 'фанта'], per100: { kcal: 42, protein: 0, fat: 0, carbs: 11 } },
  { name: 'Сок яблочный', aliases: ['яблочный сок', 'сок мультифрукт'], per100: { kcal: 46, protein: 0.1, fat: 0.1, carbs: 11 } },
  { name: 'Сок томатный', aliases: ['томатный сок'], per100: { kcal: 21, protein: 1, fat: 0.1, carbs: 4 } },
  { name: 'Протеиновый коктейль', aliases: ['протеиновый коктейль', 'протеиновый шейк'], per100: { kcal: 70, protein: 10, fat: 1.5, carbs: 4 } },
  { name: 'Сидр', aliases: ['сидр'], per100: { kcal: 49, protein: 0, fat: 0, carbs: 5 } },

  // Составные/готовые блюда (кафе, домашняя кухня) — их нет в generic-базе, но часто едят.
  { name: 'Жульен', aliases: ['жульен', 'жюльен', 'жульен с грибами'], per100: { kcal: 195, protein: 8, fat: 15, carbs: 6 } },
  { name: 'Лазанья', aliases: ['лазанья'], per100: { kcal: 165, protein: 9, fat: 8, carbs: 14 } },
  { name: 'Паста карбонара', aliases: ['карбонара', 'паста карбонара'], per100: { kcal: 200, protein: 8, fat: 9, carbs: 22 } },
  { name: 'Паста болоньезе', aliases: ['болоньезе', 'паста болоньезе'], per100: { kcal: 150, protein: 7, fat: 5, carbs: 19 } },
  { name: 'Ризотто', aliases: ['ризотто'], per100: { kcal: 160, protein: 4, fat: 5, carbs: 24 } },
  { name: 'Салат Цезарь', aliases: ['цезарь', 'салат цезарь'], per100: { kcal: 190, protein: 9, fat: 14, carbs: 6 } },
  { name: 'Греческий салат', aliases: ['греческий салат'], per100: { kcal: 120, protein: 3, fat: 10, carbs: 5 } },
  { name: 'Селёдка под шубой', aliases: ['шуба', 'селёдка под шубой', 'сельдь под шубой'], per100: { kcal: 190, protein: 5, fat: 15, carbs: 8 } },
  { name: 'Мимоза (салат)', aliases: ['мимоза'], per100: { kcal: 195, protein: 6, fat: 16, carbs: 6 } },
  { name: 'Шаурма', aliases: ['шаурма', 'шаверма'], per100: { kcal: 220, protein: 11, fat: 12, carbs: 18 } },
  { name: 'Бургер', aliases: ['бургер', 'гамбургер', 'чизбургер'], per100: { kcal: 260, protein: 12, fat: 14, carbs: 22 } },
  { name: 'Наггетсы', aliases: ['наггетсы', 'нагетсы'], per100: { kcal: 290, protein: 15, fat: 18, carbs: 16 } },
  { name: 'Картофель фри', aliases: ['фри', 'картофель фри', 'картошка фри'], per100: { kcal: 312, protein: 3.4, fat: 15, carbs: 41 } },
  { name: 'Чебурек', aliases: ['чебурек'], per100: { kcal: 264, protein: 8, fat: 15, carbs: 24 } },
  { name: 'Беляш', aliases: ['беляш'], per100: { kcal: 275, protein: 9, fat: 16, carbs: 24 } },
  { name: 'Хачапури', aliases: ['хачапури'], per100: { kcal: 285, protein: 10, fat: 15, carbs: 28 } },
  { name: 'Драники', aliases: ['драники', 'деруны'], per100: { kcal: 180, protein: 4, fat: 10, carbs: 19 } },
  { name: 'Творожная запеканка', aliases: ['запеканка', 'творожная запеканка'], per100: { kcal: 168, protein: 15, fat: 6, carbs: 15 } },
  { name: 'Голубцы', aliases: ['голубцы', 'голубец'], per100: { kcal: 125, protein: 6, fat: 7, carbs: 9 } },
  { name: 'Долма', aliases: ['долма'], per100: { kcal: 175, protein: 5, fat: 12, carbs: 11 } },
  { name: 'Лагман', aliases: ['лагман'], per100: { kcal: 145, protein: 6, fat: 7, carbs: 14 } },
  { name: 'Солянка', aliases: ['солянка'], per100: { kcal: 90, protein: 5, fat: 6, carbs: 4 } },
  { name: 'Уха', aliases: ['уха'], per100: { kcal: 55, protein: 5, fat: 2, carbs: 3 } },
  { name: 'Харчо', aliases: ['харчо'], per100: { kcal: 90, protein: 4, fat: 5, carbs: 7 } },
  { name: 'Окрошка', aliases: ['окрошка'], per100: { kcal: 60, protein: 3, fat: 3, carbs: 5 } },
  { name: 'Гуляш', aliases: ['гуляш'], per100: { kcal: 150, protein: 12, fat: 9, carbs: 5 } },
  { name: 'Бефстроганов', aliases: ['бефстроганов', 'бефстроганофф'], per100: { kcal: 190, protein: 14, fat: 13, carbs: 4 } },
  { name: 'Тефтели', aliases: ['тефтели', 'тефтеля'], per100: { kcal: 170, protein: 11, fat: 10, carbs: 8 } },
  { name: 'Люля-кебаб', aliases: ['люля', 'люля-кебаб'], per100: { kcal: 230, protein: 15, fat: 18, carbs: 1 } },
  { name: 'Шашлык', aliases: ['шашлык'], per100: { kcal: 220, protein: 19, fat: 15, carbs: 0 } },
  { name: 'Котлета по-киевски', aliases: ['котлета по-киевски', 'по-киевски'], per100: { kcal: 240, protein: 14, fat: 17, carbs: 8 } },
  { name: 'Рагу овощное', aliases: ['рагу', 'овощное рагу'], per100: { kcal: 80, protein: 2, fat: 4, carbs: 9 } },
  { name: 'Макароны по-флотски', aliases: ['по-флотски', 'макароны по-флотски'], per100: { kcal: 185, protein: 8, fat: 8, carbs: 20 } },
];

// Полная база: сначала выверенные generic-продукты (CURATED + Calorizator) — приоритет в поиске,
// затем большая брендовая из OFF (GENERATED).
export const FOODS = [...CURATED, ...CALORIZATOR, ...GENERATED];

function norm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[.,!?]/g, '').trim();
}

// Кэш нормализованной «сенной кучи» и слов на объекте продукта (считаем один раз).
const _hayCache = new WeakMap();
const _wordCache = new WeakMap();
const _namesCache = new WeakMap();
function hay(f) {
  let v = _hayCache.get(f);
  if (v === undefined) { v = [f.name, ...(f.aliases || [])].map(norm).join(' '); _hayCache.set(f, v); }
  return v;
}
function wordSet(f) {
  let v = _wordCache.get(f);
  if (!v) {
    v = new Set();
    [f.name, ...(f.aliases || [])].forEach((x) => norm(x).split(/\s+/).forEach((w) => { if (w.length > 2) v.add(w); }));
    _wordCache.set(f, v);
  }
  return v;
}
function namesNorm(f) {
  let v = _namesCache.get(f);
  if (!v) { v = [f.name, ...(f.aliases || [])].map(norm); _namesCache.set(f, v); }
  return v;
}

// Свои продукты пользователя (из хранилища). Store вызывает setCustomFoods при загрузке/изменении.
let CUSTOM = [];
export function setCustomFoods(list) {
  CUSTOM = Array.isArray(list) ? list : [];
}
// Все продукты: свои идут первыми (приоритет над базой при совпадении).
function allFoods() {
  return [...CUSTOM, ...FOODS];
}

// Поиск по названию (для ручного ввода) — список совпадений (ограничиваем, чтобы не тормозило)
export function searchFoods(query, limit = 30) {
  const all = allFoods();
  const n = norm(query);
  if (!n) return all.slice(0, 15);
  const out = [];
  for (const f of all) {
    if (hay(f).includes(n)) {
      out.push(f);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// Разбить на значимые слова (короткие предлоги «с», «и», «на» отбрасываем)
function words(s) {
  return norm(s).split(/\s+/).filter((w) => w.length > 2);
}

// Найти лучший продукт по названию — СТРОГО по словам, чтобы не подменять
// «колбаса краковская» на «колбаса варёная». Совпадение только если ВСЕ слова
// запроса есть в названии/синонимах продукта (запрос не менее конкретен).
export function findFood(name) {
  const q = words(name);
  if (!q.length) return null;
  const nExact = norm(name);
  let best = null;
  let bestScore = -1;
  for (const f of allFoods()) {
    // 1) точное совпадение имени/синонима — максимальный приоритет
    if (namesNorm(f).includes(nExact)) return f;
    // 2) все слова запроса присутствуют в словах продукта (продукт ≥ конкретен)
    const cand = wordSet(f);
    if (!q.every((w) => cand.has(w))) continue;
    const score = q.length * 100 - (cand.size - q.length);
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return best;
}

// Пересчёт значений на указанные граммы
export function scale(per100, grams) {
  const k = (Number(grams) || 0) / 100;
  return {
    kcal: Math.round(per100.kcal * k),
    protein: +(per100.protein * k).toFixed(1),
    fat: +(per100.fat * k).toFixed(1),
    carbs: +(per100.carbs * k).toFixed(1),
  };
}

// Восстановить значения на 100 г из готовой порции (для ИИ-позиций без базы).
export function per100From(macros, grams) {
  const g = Number(grams) || 100;
  const k = 100 / g;
  return {
    kcal: (Number(macros.kcal) || 0) * k,
    protein: (Number(macros.protein) || 0) * k,
    fat: (Number(macros.fat) || 0) * k,
    carbs: (Number(macros.carbs) || 0) * k,
  };
}

// Единая форма позиции: название + граммы + per100 (база), ккал/БЖУ считаются от граммов.
export function makeItem(name, grams, per100) {
  const g = Math.round(Number(grams) || 0);
  const s = scale(per100, g);
  return { name: String(name || 'Блюдо'), grams: g, per100, kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs };
}
