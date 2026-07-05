import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { PrintLayout } from '@/lib/setlist-print'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 25,
  },
  venue: {
    fontSize: 34,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
  },
  date: {
    fontSize: 22,
    marginTop: 6,
  },
  columns: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },
  soundcheckBlock: {
    marginBottom: 11,
  },
  setBlock: {
    marginBottom: 7,
  },
  encoreBlock: {
    marginTop: 9,
  },
  secLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 1,
    marginBottom: 3,
  },
  secLabelSm: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 1,
    marginBottom: 3,
  },
  song: {
    fontSize: 20,
    lineHeight: 1.25,
    flexDirection: 'row',
    gap: 4,
  },
  songSm: {
    fontSize: 18,
    lineHeight: 1.25,
    flexDirection: 'row',
    gap: 4,
  },
  num: {
    minWidth: 24,
    textAlign: 'right',
    color: '#555',
  },
  numSm: {
    minWidth: 20,
    textAlign: 'right',
    color: '#555',
  },
  key: {
    marginLeft: 'auto',
    color: '#555',
    fontSize: 14,
    paddingLeft: 4,
  },
})

export type GigSetlistPdfProps = {
  venueName: string
  date: string
  layout: PrintLayout
}

export function GigSetlistPdf({ venueName, date, layout }: GigSetlistPdfProps) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.venue}>{venueName}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.columns}>
          {layout.columns.map((column, colIndex) => {
            const isFirst = colIndex === 0
            const isLast = colIndex === layout.columns.length - 1

            return (
              <View key={column.label} style={styles.column}>
                {isFirst && layout.soundcheck.length > 0 && (
                  <View style={styles.soundcheckBlock}>
                    <Text style={styles.secLabelSm}>Soundcheck</Text>
                    {layout.soundcheck.map((song) => (
                      <View key={song.displayNumber} style={styles.songSm}>
                        <Text style={styles.numSm}>{song.displayNumber}.</Text>
                        <Text>{song.title}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.setBlock}>
                  <Text style={styles.secLabel}>{column.label}</Text>
                  {column.songs.map((song) => (
                    <View key={song.displayNumber} style={styles.song}>
                      <Text style={styles.num}>{song.displayNumber}.</Text>
                      <Text>{song.title}</Text>
                      {song.key && <Text style={styles.key}>{song.key}</Text>}
                    </View>
                  ))}
                </View>

                {isLast && layout.encore.length > 0 && (
                  <View style={styles.encoreBlock}>
                    <Text style={styles.secLabel}>Encore</Text>
                    {layout.encore.map((song) => (
                      <View key={song.displayNumber} style={styles.song}>
                        <Text style={styles.num}>{song.displayNumber}.</Text>
                        <Text>{song.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </Page>
    </Document>
  )
}
