import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import assert from 'assert';
import chromedriver from 'chromedriver';

const TIMEOUT = 15000;
const BASE_URL = 'http://localhost:5173';

async function runLoginModalGuiTest() {
  console.log(' Iniciando prueba Selenium GUI...');

  const service = new chrome.ServiceBuilder(chromedriver.path);

  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1366,768');

  console.log(' Creando navegador Chrome...');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeService(service)
    .setChromeOptions(options)
    .build();

  try {
    console.log(' Abriendo frontend...');
    await driver.get(BASE_URL);

    console.log(' Buscando título Iniciar sesión...');
    const loginTitle = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(., 'Iniciar sesión')]")),
      TIMEOUT
    );
    assert(await loginTitle.isDisplayed());

    console.log(' Buscando campo correo...');
    const emailInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'correo') or contains(@placeholder, 'Correo')]")),
      TIMEOUT
    );
    assert(await emailInput.isDisplayed());

    console.log(' Buscando campo contraseña...');
    const passwordInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'contraseña') or contains(@placeholder, 'Contraseña')]")),
      TIMEOUT
    );
    assert(await passwordInput.isDisplayed());

    console.log(' Buscando botón Entrar...');
    const entrarButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Entrar')]")),
      TIMEOUT
    );
    assert(await entrarButton.isDisplayed());

    console.log(' Cambiando a registro...');
    const registrateButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Regístrate')]")),
      TIMEOUT
    );
    await registrateButton.click();

    console.log(' Buscando Crear cuenta...');
    const crearCuentaTitle = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(., 'Crear cuenta')]")),
      TIMEOUT
    );
    assert(await crearCuentaTitle.isDisplayed());

    console.log(' Buscando campo nombre...');
    const nameInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'nombre') or contains(@placeholder, 'Nombre')]")),
      TIMEOUT
    );
    assert(await nameInput.isDisplayed());

    console.log(' Selenium GUI test passed');
  } catch (error) {
    console.error(' Selenium GUI test failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runLoginModalGuiTest();