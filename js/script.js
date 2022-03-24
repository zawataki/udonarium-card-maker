function makeSequentialCards() {
  (async () => {
    const back = 'image/card_back_blue.png';
    const frontTemplate = 'image/card-with-number.svg';
    const firstNum = Number($('#firstNumber').val());
    const lastNum = Number($('#lastNumber').val());

    if (firstNum > lastNum) {
      throw new Error("始まりの数字は終わりの数字以下にする必要があります。");
    }

    const zip = new JSZip();

    const frontResponse = await fetch(frontTemplate);
    const cardTemplateContent = await frontResponse.text();

    const sha256HashList = [];
    for (let n = firstNum; n <= lastNum; n++) {
      let newSvgContent = cardTemplateContent.replace(/1(\n\s+<\/text>)/m, n + "$1");
      let blob = new Blob([newSvgContent], {type: "image/svg+xml"});

      const sha256Hash = await getSha256Hash(blob);
      zip.file(sha256Hash + ".svg", blob);
      sha256HashList.push(sha256Hash);
    }

    const backResponse = await fetch(back);
    const backBlob = await backResponse.blob();
    const backSha256Hash = await getSha256Hash(backBlob);
    zip.file(backSha256Hash + ".png", backBlob);

    const dataXmlResponse = await fetch("template/data.xml");
    const dataXmlTemplateContent = await dataXmlResponse.text();
    const domParser = new DOMParser();
    const xmlDocument = domParser.parseFromString(dataXmlTemplateContent, 'application/xml');
    const card = xmlDocument.querySelector('card');
    const cardParentNode = xmlDocument.querySelector('node');
    for (const hash of sha256HashList) {
      const newCard = card.cloneNode(true);
      newCard.querySelector('data[name="front"]').textContent = hash;
      newCard.querySelector('data[name="back"]').textContent = backSha256Hash;
      cardParentNode.append(newCard);
    }
    card.remove();
    const dataXmlContent = new XMLSerializer().serializeToString(xmlDocument);
    const dataXmlBlob = new Blob([dataXmlContent], {type: "application/xml"});
    zip.file("data.xml", dataXmlBlob);

    const zipBlob = await zip.generateAsync({type: "blob"});
    const zipUrl = URL.createObjectURL(zipBlob);
    autoDownload("card.zip", zipUrl);

    document.querySelector('#errorMessage').textContent = "";
  })()
    .catch(error => {
      console.error("Failed to make sequential cards", error);

      document.querySelector('#errorMessage').textContent =
        "作成に失敗しました。" + error.message;
    });
}

async function getSha256Hash(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  // Convert ArrayBuffer to hex string
  // (from: https://stackoverflow.com/a/40031979)
  return [].map.call(new Uint8Array(digest), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function autoDownload(filename, url) {
  let a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
