import unittest

from assets import Assets
from portfolio import Portfolio
from simulation import runSimulation
from strategies.constant_amount import ConstantWithdrawalAmountStrategy
from strategies.constant_percent import ConstantPercentWithdrawalStrategy
from strategies.guyton_klinger import GuytonKlinger
from strategies.vpw import Vpw
from strategies.hebeler_autopilot import HebelerAuto
from strategies.strategy_base import StrategyBase

'''
This is a collection of tests that primarily verify the overall engine is functioning correctly.

They frequently overlap with the strategy specific tests.
'''
class TestStrategies(unittest.TestCase):
    def test_unitPortfolio(self):
        result = runSimulation(
            30,
            1.0,
            .04,
            (
                (ConstantWithdrawalAmountStrategy(.04), Assets(.5, .5), 1.0),
            ),
            1926,
            1997
        )

        self.assertAlmostEqual(result.getSuccessRate(), .95, delta=.005)


    def test_largePortfolio(self):
        i = 1000000
        result = runSimulation(
            30,
            i,
            i * 0.04,
            (
                (ConstantWithdrawalAmountStrategy(i * .04), Assets(.5, .5), 1.0),
            ),
            1926,
            1997
        )

        self.assertAlmostEqual(result.getSuccessRate(), .95, delta=.005)


    def test_multipleStrategies(self):
        i = 1000000
        result = runSimulation(
            30,
            i,
            i * 0.04,
            (
                (ConstantWithdrawalAmountStrategy(i * .04 * .6), Assets(.5, .5), .6),
                (ConstantWithdrawalAmountStrategy(i * .04 * .4), Assets(.5, .5), .4)
            ),
            1926,
            1997
        )

        self.assertAlmostEqual(result.getSuccessRate(), .95, delta=.005)



    def test_multipleDifferentStrategies(self):
        i = 1000000
        result = runSimulation(
            30,
            i,
            0.0,
            (
                (ConstantWithdrawalAmountStrategy(i * .04 * .5), Assets(.5, .5), .5),
                (ConstantPercentWithdrawalStrategy(.10), Assets(1.0, 0.0), .5)
            ),
            1926,
            2010
        )

        #it always works because you never run out with a percent withdrwawal strategy
        self.assertAlmostEqual(result.getSuccessRate(), 1.0, delta=.005)

    def test_yearBase(self):
        length = 30
        gk = GuytonKlinger(.05, length)
        gk.reset(Portfolio(Assets(.5, .5)))

        # withdraw and grow once
        initialWithdrawal = gk.withdraw(1.0, 12)
        initialPortfolio = gk.getPortfolioValue()
        gk.grow(Assets(1.1, 1.1))

        # now do it 11 more times
        for i in range(1, 12):
            withdrawal = gk.withdraw(1.0, 12)
            gk.grow(Assets(1.1, 1.1))
            portfolio = gk.getPortfolioValue()
            self.assertAlmostEqual(withdrawal, initialWithdrawal, delta=.0005)
            self.assertAlmostEqual(portfolio, initialPortfolio - (i * initialWithdrawal), delta=.0005)

        # now do it 1 more time, which will trigger the new year calculations.
        grownWithdrawal = gk.withdraw(1.1, 12)
        gk.grow(Assets(1.1, 1.1))
        grownPortfolio = gk.getPortfolioValue()
        self.assertNotAlmostEqual(grownWithdrawal, initialWithdrawal, delta=.00005)
        self.assertNotAlmostEqual(grownPortfolio, initialPortfolio, delta=.00005)

    # Just a copy of the constant percent strategy, where we thrown in extra money on every withdrawal, grow, and portfolio value call
    # that we have conjured out of nowhere. The only purpose of this class is to give us a negative (wait, is is positive?)
    # test case for test_notConjuringMoney.
    # http://harrypotter.wikia.com/wiki/Leprechaun_gold
    class LepreachaunGoldStrategy(StrategyBase):
        def __init__(self, percent):
            self.percent = percent

        def getInitialWithDrawal(self):
            return self.initialWithdrawal

        def reset(self, portfolio):
            self.portfolio = portfolio
            self.initialWithdrawal = portfolio.value * self.percent

        def withdraw(self, inflationRate, numPeriodsPerYear):
            withdrawal = self.portfolio.value * self.percent / numPeriodsPerYear
            self.portfolio.withdraw(withdrawal)
            return withdrawal + 1.0 # The leprechaun gold!

        def getPortfolioValue(self):
            return self.portfolio.value + 10.0 # More leprechaun gold!

        def grow(self, monthGrowth):
            self.portfolio.grow(monthGrowth * 1.01) # More gold!

    # This is really about the preconditions and postconditions of
    # grow, withdraw, and getPortfolioValue.
    # They happen like this:
    # while(simulationGoing):
    #   th(portfolioValue)
    #   withdraw()
    #   th(growth)
    #   grow()
    #   th(portfolioValue, withdrawal)
    #
    # We have testhooks (th()) to look at the portfolio values, growths and withdrawals being reported by the strategy
    # on the front, middle, and back of that loop. So we can simply observe that the math works.
    #
    #   TODO: This currently does not handle asset allocation changes in strategies.
    #
    def test_notConjuringMoney(self):
        assets = Assets(.5, .5)
        i = 1000000
        simLength = 30

        strategies = [
            (GuytonKlinger(i * .04, simLength), assets, 1.0),
            (ConstantWithdrawalAmountStrategy(i * .04), assets, 1.0),
            (ConstantPercentWithdrawalStrategy(.04), assets, 1.0),
            (Vpw(.02, simLength, .04), assets, 1.0),
            (HebelerAuto(55), assets, 1.0)
        ]

        class mblp:  # stands for "Make better lambdas python"
            prePortfolio = Portfolio(assets, i)
            growth = None

        def pre(observedPrePortfolioValue, observedGrowth, strategies):
            if len(strategies) != 1:
                raise RuntimeError

            mblp.growth = max(observedGrowth)
            if hasattr(strategies[0], 'yearGrowthAccumulator'):
                mblp.growth = max(mblp.growth, max(strategies[0].yearGrowthAccumulator), 1.0)

            mblp.prePortfolio.value = observedPrePortfolioValue

        def post(observedPortfolioValue, observedWithdrawal):
            mblp.prePortfolio.value -= observedWithdrawal
            mblp.prePortfolio.value = mblp.prePortfolio.value * mblp.growth
            maxPossible = mblp.prePortfolio.value
            observed = observedPortfolioValue
            self.assertGreaterEqual(maxPossible + .00001, observed, msg="Leprechauns detected.")

        for s in strategies:
            mblp.prePortfolio = Portfolio(assets, i)
            mblp.growth = None

            testhook = {
                "pre": pre,
                "post": post
            }
            
            runSimulation(
                simLength,
                i,
                i * 0.02,
                (
                    s,
                ),
                1926,
                2010,
                ignoreInflation=True,
                testCallback=testhook
            )





