import unittest

from assets import Assets
from simulator import run_simulation
from strategies.hebeler_autopilot import HebelerAuto

'''
This is a big TODO. Right now this just detects runtime errors.
'''
class TestHebeler(unittest.TestCase):
    def test_basicWithdrawal(self):
        retirementLength = 30
        initialPortfolio = 1 * 1000 * 1000

        result = run_simulation(
            retirementLength,
            initialPortfolio,
            .05 * initialPortfolio * .5,
            (
                (HebelerAuto(55), Assets(.5, .5), 1.0),
            ),
            1926,
            2010
        )

        result.getSimResults()

        print(result)
