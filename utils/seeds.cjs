
const walletSeeds = {
// Вводите сид-фразы таком ключе:
// 1: "seed phase", и так далее

};

// Функция для получения seed-фразы по ID
function getSeed(walletId) {
  if (walletId in walletSeeds) {
    return walletSeeds[walletId];
  } else {
    throw new Error(`Wallet with ID ${walletId} not found`);
  }
}

// Экспортируем функцию и данные
module.exports = {
  walletSeeds,
  getSeed
};