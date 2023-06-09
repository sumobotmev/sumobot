import REDACTED
import REDACTED
import REDACTED
import REDACTED
import REDACTED

const BN_18 = parseUnits("1");

/*
  Binary search to find optimal sandwichable amount

  Using binary search here as the profit function isn't normally distributed
*/
export const binarySearch = (
  left, // Lower bound
  right, // Upper bound
  calculateF, // Generic calculate function
  passConditionF, // Condition checker
  tolerance = parseUnits("0.01") // Tolerable delta (in %, in 18 dec, i.e. parseUnits('0.01') means left and right delta can be 1%)
) => {
  if (right.sub(left).gt(tolerance.mul(right.add(left).div(2)).div(BN_18))) {
    const mid = right.add(left).div(2);
    const out = calculateF(mid);

    // If we pass the condition
    // Number goes up
    if (passConditionF(out)) {
      return binarySearch(mid, right, calculateF, passConditionF, tolerance);
    }

    // Number goes down
    return binarySearch(left, mid, calculateF, passConditionF, tolerance);
  }

  // No negatives
  const ret = right.add(left).div(2);
  if (ret.lt(0)) {
    return ethers.constants.Zero;
  }

  return ret;
};


  //Calculate the max sandwich amount
export const calcSandwichOptimalIn = (
  userAmountIn,
  userMinRecvToken,
  reserveWeth,
  reserveToken
) => {
  
  const calcF = (amountIn) => {
    const frontrunState = getUniv2DataGivenIn(
      amountIn,
      reserveWeth,
      reserveToken
    );
    const victimState = getUniv2DataGivenIn(
      userAmountIn,
      frontrunState.newReserveA,
      frontrunState.newReserveB
    );
    return victimState.amountOut;
  };

  const passF = (amountOut) => amountOut.gte(userMinRecvToken);

  //optimze to your budget
  const lowerBound = parseUnits("0");
  const upperBound = parseUnits("100");

  // Optimal WETH in to push reserve to the point where the user
  // _JUST_ receives their min recv
  const optimalWethIn = binarySearch(lowerBound, upperBound, calcF, passF);

  return optimalWethIn;
};

export const calcSandwichState = (
  optimalSandwichWethIn,
  userWethIn,
  userMinRecv,
  reserveWeth,
  reserveToken
) => {
  const frontrunState = getUniv2DataGivenIn(
    optimalSandwichWethIn,
    reserveWeth,
    reserveToken
  );
  const victimState = getUniv2DataGivenIn(
    userWethIn,
    frontrunState.newReserveA,
    frontrunState.newReserveB
  );
  const backrunState = getUniv2DataGivenIn(
    frontrunState.amountOut,
    victimState.newReserveB,
    victimState.newReserveA
  );

  // Sanity check
  if (victimState.amountOut.lt(userMinRecv)) {
    return null;
  }

  // Return
  return {
    // NOT PROFIT
    // Profit = post gas
    revenue: backrunState.amountOut.sub(optimalSandwichWethIn),
    optimalSandwichWethIn,
    userAmountIn: userWethIn,
    userMinRecv,
    reserveState: {
      reserveWeth,
      reserveToken,
    },
    frontrun: frontrunState,
    victim: victimState,
    backrun: backrunState,
  };
};
