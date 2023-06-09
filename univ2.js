import REDACTED
import REDACTED
import REDACTED


export const sortTokens = (tokenA, tokenB) => {
  if (ethers.BigNumber.from(tokenA).lt(ethers.BigNumber.from(tokenB))) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
};


export const getUniv2PairAddress = (tokenA, tokenB) => {
  const [token0, token1] = sortTokens(tokenA, tokenB);

  const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
  const address = ethers.utils.getCreate2Address(
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Factory address (contract creator)
    salt,
    "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
  );

  return address;
};

/*
  Get reserve helper function
*/
export const getUniv2Reserve = async (pair, tokenA, tokenB) => {
  const [token0] = sortTokens(tokenA, tokenB);
  const [reserve0, reserve1] = await uniswapV2Pair.attach(pair).getReserves();

  if (match(tokenA, token0)) {
    return [reserve0, reserve1];
  }
  return [reserve1, reserve0];
};


export const getUniv2DataGivenIn = (aIn, reserveA, reserveB) => {
  const aInWithFee = aIn.mul(997);
  const numerator = aInWithFee.mul(reserveB);
  const denominator = aInWithFee.add(reserveA.mul(1000));
  const bOut = numerator.div(denominator);

  // Underflow
  let newReserveB = reserveB.sub(bOut);
  if (newReserveB.lt(0) || newReserveB.gt(reserveB)) {
    newReserveB = ethers.BigNumber.from(1);
  }

  // Overflow
  let newReserveA = reserveA.add(aIn);
  if (newReserveA.lt(reserveA)) {
    newReserveA = ethers.constants.MaxInt256;
  }

  return {
    amountOut: bOut,
    newReserveA,
    newReserveB,
  };
};


export const getUniv2DataGivenOut = (bOut, reserveA, reserveB) => {
  // Underflow
  let newReserveB = reserveB.sub(bOut);
  if (newReserveB.lt(0) || reserveB.gt(reserveB)) {
    newReserveB = ethers.BigNumber.from(1);
  }

  const numerator = reserveA.mul(bOut).mul(1000);
  const denominator = newReserveB.mul(997);
  const aAmountIn = numerator.div(denominator).add(ethers.constants.One);

  // Overflow
  let newReserveA = reserveA.add(aAmountIn);
  if (newReserveA.lt(reserveA)) {
    newReserveA = ethers.constants.MaxInt256;
  }

  return {
    amountIn: aAmountIn,
    newReserveA,
    newReserveB,
  };
};


export const getUniv2ExactWethTokenMinRecv = async (finalMinRecv, path) => {
  let userMinRecv = finalMinRecv;

  for (let i = path.length - 1; i > 1; i--) {
    const fromToken = path[i - 1];
    const toToken = path[i];

    const pair = getUniv2PairAddress(fromToken, toToken);
    const [reserveFrom, reserveTo] = await getUniv2Reserve(
      pair,
      fromToken,
      toToken
    );

    const newReserveData = await getUniv2DataGivenOut(
      userMinRecv,
      reserveFrom,
      reserveTo
    );
    userMinRecv = newReserveData.amountIn;
  }

  return userMinRecv;
};
