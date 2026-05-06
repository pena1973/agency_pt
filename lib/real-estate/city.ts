const lowercaseCityParts = new Set(["de", "da", "do", "das", "dos", "e"]);

function normalizeCityWord(word: string, wordIndex: number) {
  return word
    .split("-")
    .map((part) => {
      const lowerPart = part.toLocaleLowerCase("ru-RU");

      if (!lowerPart) {
        return lowerPart;
      }

      if (wordIndex > 0 && lowercaseCityParts.has(lowerPart)) {
        return lowerPart;
      }

      return `${lowerPart.charAt(0).toLocaleUpperCase("ru-RU")}${lowerPart.slice(1)}`;
    })
    .join("-");
}

export function normalizeCityName(value: string | undefined | null, fallback = "Лиссабон") {
  const compactValue = (value ?? "").trim().replace(/\s+/g, " ");

  if (!compactValue) {
    return fallback;
  }

  return compactValue
    .split(" ")
    .map((word, index) => normalizeCityWord(word, index))
    .join(" ");
}
