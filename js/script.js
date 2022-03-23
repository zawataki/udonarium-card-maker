
function calcTax(taxableIncome) {
  let incomeTax = 0

  if (0 <= taxableIncome && taxableIncome <= 1950000)
    incomeTax = taxableIncome * 0.05
  else if (1950000 <= taxableIncome && taxableIncome <= 3300000)
    incomeTax = taxableIncome * 0.1 - 97500
  else if (3300000 <= taxableIncome && taxableIncome <= 6950000)
    incomeTax = taxableIncome * 0.2 - 427500
  else if (6950000 <= taxableIncome && taxableIncome <= 9000000)
    incomeTax = taxableIncome * 0.23 - 636000
  else if (9000000 <= taxableIncome && taxableIncome <= 18000000)
    incomeTax = taxableIncome * 0.33 - 1536000
  else if (18000000 <= taxableIncome && taxableIncome <= 40000000)
    incomeTax = taxableIncome * 0.4 - 2796000
  else
    incomeTax = taxableIncome * 0.45 - 4796000

  incomeTax = Math.floor(incomeTax)
  let reconstructionTax = Math.floor(incomeTax * 0.021) / 100 * 100
  reconstructionTax = Math.floor(reconstructionTax)

  $("#total_income_tax").text((incomeTax + reconstructionTax).toLocaleString())
  $("#normal_income_tax").text(incomeTax.toLocaleString())
  $("#reconstruction_special_income_tax").text(reconstructionTax.toLocaleString())

  $("#reconstruction_special_income_tax").css("width", $("#total_income_tax").css("width"))
}

function clearInputField() {
  $('#taxable_income').val('')
  calcTax(0)
}

$(function() {
  // Execute each typing key
  $('input[type="number"]').keyup(function() {
    let taxableIncome = $(this).val()
    calcTax(taxableIncome)
  });
})


function makeSequentialCards() {
  const back = 'image/card_back_blue.png';
  const frontTemplate = 'image/card-with-number.svg';
  const firstNum = Number($('#firstNumber').val());
  const lastNum = Number($('#lastNumber').val());

  if (firstNum > lastNum) {
    console.error("lastNum must be equal to firstNum or more");
    return;
  }

  const zip = new JSZip();

  (async () => {
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
  })()
    .catch(error => {
      console.error("Failed to make sequential cards", error);
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

// TODO: 任意の画像やテキストを持つカードを作成する
