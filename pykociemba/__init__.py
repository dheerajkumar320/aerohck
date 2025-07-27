from .color import *
from .coordcube import *
from .cubiecube import *
from .edge import *
from .facecube import *
from .facelet import *
from .search import Search, patternize
from .tools import *

def solve(cubestring, patternstring=None):
    if patternstring:
        return Search().solution(patternize(cubestring, patternstring), 24, 1000, False)
    return Search().solution(cubestring, 24, 1000, False)
