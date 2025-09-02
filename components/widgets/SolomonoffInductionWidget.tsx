'use client'

import React, { useState, useMemo } from 'react'
import styles from './SolomonoffInductionWidget.module.css'
import { Tooltip } from '../content/Tooltip'

// Widget for demonstrating Solomonoff prior & induction
// Shows how different hypotheses about coin generation are updated via Bayes theorem  
// as new observations arrive - updated with new sequence

type Coin = 'R' | 'B'

interface Hypothesis {
  id: number
  name: string
  description: string
  // Prior in bits (log2 space) - program length
  priorBits: number
  // Function to calculate probability of generating a specific coin at position i
  probability: (position: number, coin: Coin) => number
}

const HYPOTHESES: Hypothesis[] = [
  {
    id: 0,
    name: 'Uniform',
    description: 'Each coin is 50% R, 50% B',
    priorBits: 0, // 2^-0 = 1 (shortest program)
    probability: (_position: number, coin: Coin) => 0.5
  },
  {
    id: 1,
    name: 'Biased',
    description: '60% chance R, 40% chance B',
    priorBits: 5, // 2^-5 (more complex program)
    probability: (_position: number, coin: Coin) => coin === 'R' ? 0.6 : 0.4
  },
  {
    id: 2,
    name: 'Alternating',
    description: '90% alternating pattern (R-B-R-B...)',
    priorBits: 8, // 2^-8 
    probability: (position: number, coin: Coin) => {
      const expectedCoin = position % 2 === 0 ? 'R' : 'B'
      return coin === expectedCoin ? 0.9 : 0.1
    }
  },
  {
    id: 3,
    name: 'Half-half',
    description: '2/3 R for positions 0-4 mod 10, 1/3 R for 5-9',
    priorBits: 9, // 2^-9 (most complex program)
    probability: (position: number, coin: Coin) => {
      const mod = position % 10
      // 2/3 R for positions 0,1,2,3,4 mod 10
      // 1/3 R for positions 5,6,7,8,9 mod 10
      if (mod <= 4) {
        return coin === 'R' ? 2/3 : 1/3
      } else {
        return coin === 'R' ? 1/3 : 2/3
      }
    }
  }
]

const INITIAL_SEQUENCE: Coin[] = ['R', 'B', 'R', 'R', 'R', 'B', 'R', 'B', 'R', 'B']

export function SolomonoffMiniWidget() {
  const firstTenCoins = INITIAL_SEQUENCE.slice(0, 10)

  return (
    <div className={styles.miniContainer}>
      <div className={styles.miniCoinGrid}>
        {firstTenCoins.map((coin, idx) => (
          <div 
            key={idx} 
            className={`${styles.coin} ${coin === 'R' ? styles.red : styles.blue}`}
          >
            {coin}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SolomonoffInductionWidget() {
  const [sequence, setSequence] = useState<Coin[]>(INITIAL_SEQUENCE)
  const [correctHypothesis, setCorrectHypothesis] = useState<number>(0)
  const [showProbabilities, setShowProbabilities] = useState<boolean>(false)

  // Calculate posteriors in log space, tracking prior and evidence separately
  const posteriors = useMemo(() => {
    const result: { [key: number]: { total: number, prior: number, evidence: number } } = {}
    
    // Start with priors (in log2 space, negative values)
    HYPOTHESES.forEach(h => {
      result[h.id] = {
        prior: -h.priorBits,
        evidence: 0,
        total: -h.priorBits
      }
    })

    // Update with likelihood of observed sequence
    sequence.forEach((coin, position) => {
      Object.keys(result).forEach(key => {
        const hypId = parseInt(key)
        const hypothesis = HYPOTHESES.find(h => h.id === hypId)!
        const likelihood = hypothesis.probability(position, coin)
        
        if (likelihood === 0) {
          // Set to -Infinity for 0 probability
          result[hypId].evidence = -Infinity
          result[hypId].total = -Infinity
        } else if (result[hypId].evidence !== -Infinity) {
          // Add log likelihood
          result[hypId].evidence += Math.log2(likelihood)
          result[hypId].total = result[hypId].prior + result[hypId].evidence
        }
      })
    })

    return result
  }, [sequence])

  // Convert log posteriors to normalized probabilities for display
  const normalizedPosteriors = useMemo(() => {
    const logValues = Object.values(posteriors).map(p => p.total).filter(v => v !== -Infinity)
    if (logValues.length === 0) return {}
    
    // Find max for numerical stability
    const maxLog = Math.max(...logValues)
    
    // Convert to probabilities
    const probs: { [key: number]: number } = {}
    let sum = 0
    
    Object.entries(posteriors).forEach(([key, posterior]) => {
      if (posterior.total === -Infinity) {
        probs[parseInt(key)] = 0
      } else {
        const prob = Math.pow(2, posterior.total - maxLog)
        probs[parseInt(key)] = prob
        sum += prob
      }
    })
    
    // Normalize
    Object.keys(probs).forEach(key => {
      if (posteriors[parseInt(key)].total !== -Infinity) {
        probs[parseInt(key)] /= sum
      }
    })
    
    return probs
  }, [posteriors])

  const generateNextCoin = () => {
    const hypothesis = HYPOTHESES[correctHypothesis]
    const position = sequence.length
    const probR = hypothesis.probability(position, 'R')
    const newCoin: Coin = Math.random() < probR ? 'R' : 'B'
    setSequence([...sequence, newCoin])
  }

  const reset = () => {
    setSequence(INITIAL_SEQUENCE)
  }

  const handleHypothesisChange = (hypId: number) => {
    setCorrectHypothesis(hypId)
    setSequence(INITIAL_SEQUENCE)
  }

  const flipCoin = (index: number) => {
    const newSequence = [...sequence]
    newSequence[index] = newSequence[index] === 'R' ? 'B' : 'R'
    setSequence(newSequence)
  }

  // Find max bar height for scaling
  const maxBarHeight = Math.max(...Object.values(normalizedPosteriors), 0.001)

  return (
    <div className={styles.container}>

      {/* Box 1: Display sequence of coins */}
      <div className={styles.whiteBox}>
        <div className={styles.sequenceContainer}>
          <h3>Observed Sequence:</h3>
          <div className={styles.coinGrid}>
            {sequence.map((coin, idx) => (
              <div 
                key={idx} 
                className={`${styles.coin} ${coin === 'R' ? styles.red : styles.blue} ${styles.clickable}`}
                onClick={() => flipCoin(idx)}
              >
                {coin}
              </div>
            ))}
          </div>
          <p className={styles.explanation}>
            Click on any dot to flip it between R and B
          </p>
        </div>
      </div>

      {/* Box 2: Posterior view with toggle */}
      <div className={styles.whiteBox}>
        <div className={styles.logSpaceContainer}>
          <div className={styles.posteriorHeader}>
            <h3>{showProbabilities ? 'Posterior Probabilities' : 'Posterior'}</h3>
            <button 
              onClick={() => setShowProbabilities(!showProbabilities)}
              className={styles.toggleButton}
            >
              Show {showProbabilities ? 'Log (bits)' : 'Probabilities'}
            </button>
          </div>
          <div className={styles.logBars}>
            {HYPOTHESES.map(hypothesis => {
              if (showProbabilities) {
                // Show probabilities
                const prob = normalizedPosteriors[hypothesis.id] || 0
                const barWidth = prob * 100 // Scale to percentage
                
                return (
                  <div key={hypothesis.id} className={styles.logBarRow}>
                    <div className={styles.logBarLabel}>
                      <Tooltip tooltip={hypothesis.description}>
                        <span className={styles.hypothesisNameLink}>{hypothesis.name}</span>
                      </Tooltip>:
                    </div>
                    <div className={styles.logBarWrapper}>
                      <div 
                        className={styles.logBar}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className={styles.logBarValue}>
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              } else {
                // Show log posterior in bits
                const posterior = posteriors[hypothesis.id]
                const logPosterior = posterior.total
                
                // Find the max (non-infinite) log posterior for normalization (least negative)
                const finiteLogValues = Object.values(posteriors).map(p => p.total).filter(v => v !== -Infinity)
                const maxLogPosterior = finiteLogValues.length > 0 ? Math.max(...finiteLogValues) : 0
                
                // Scale bars: the maximum (least negative) gets full width
                // Exponential scaling for better visualization of log values
                const barWidth = logPosterior === -Infinity ? 0 : 
                               Math.max(0, Math.pow(2, logPosterior - maxLogPosterior) * 100)
                
                // Format the display string
                const displayString = logPosterior === -Infinity ? 
                  `${posterior.prior.toFixed(2)} + (-∞) = -∞ bits` : 
                  `${posterior.prior.toFixed(2)} + ${posterior.evidence.toFixed(2)} = ${logPosterior.toFixed(2)} bits`
                
                return (
                  <div key={hypothesis.id} className={styles.logBarRow}>
                    <div className={styles.logBarLabel}>
                      <Tooltip tooltip={hypothesis.description}>
                        <span className={styles.hypothesisNameLink}>{hypothesis.name}</span>
                      </Tooltip>:
                    </div>
                    <div className={styles.logBarWrapper}>
                      <div 
                        className={styles.logBar}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className={styles.logBarValue}>
                        {displayString}
                      </span>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      </div>

      {/* Box 3: Controls at the end */}
      <div className={styles.whiteBox}>
        <div className={styles.bottomControls}>
          <div className={styles.hypothesisSelector}>
            <label>True hypothesis:</label>
            <select 
              value={correctHypothesis} 
              onChange={(e) => handleHypothesisChange(parseInt(e.target.value))}
              className={styles.select}
            >
              {HYPOTHESES.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.controlButtons}>
            <button onClick={generateNextCoin} className={styles.button}>
              Generate
            </button>
            <button onClick={reset} className={styles.button}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}