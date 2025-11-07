import * as dfd from 'danfojs';
import axios from '../utils/axiosConfig';

const danfoService = {
  /**
   * Load CSV file and return a DataFrame
   * @param {File} file - CSV file to load
   * @returns {Promise<DataFrame>} - Danfo.js DataFrame
   */
  async loadCSV(file) {
    return await dfd.readCSV(file);
  },

  /**
   * Load Excel file and return a DataFrame
   * @param {File} file - Excel file to load
   * @returns {Promise<DataFrame>} - Danfo.js DataFrame
   */
  async loadExcel(file) {
    return await dfd.readExcel(file);
  },

  /**
   * Load JSON data into a DataFrame
   * @param {Array|Object} data - JSON data
   * @returns {DataFrame} - Danfo.js DataFrame
   */
  loadJSON(data) {
    return new dfd.DataFrame(data);
  },

  /**
   * Calculate statistics on the backend
   * @param {Array} data - Array of numerical values
   * @param {Array} selectedStats - Array of stat IDs to calculate
   * @returns {Promise<Object>} - Object containing calculated statistics
   */
  async calculateStatistics(data, selectedStats) {
    try {
      const response = await axios.post('/danfo/calculate-statistics', {
        data,
        selectedStats
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating statistics:', error);
      throw error;
    }
  },

  /**
   * Calculate statistics for multiple columns on the backend
   * @param {Object} dataset - Object with column arrays
   * @param {Array} selectedStats - Array of stat IDs to calculate
   * @param {Array} columns - Optional array of column names to analyze
   * @returns {Promise<Object>} - Object containing statistics by column
   */
  async calculateColumnStatistics(dataset, selectedStats, columns = null) {
    try {
      const response = await axios.post('/danfo/calculate-column-statistics', {
        dataset,
        selectedStats,
        columns
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating column statistics:', error);
      throw error;
    }
  },

  /**
   * Calculate statistics from uploaded CSV file stored in GridFS
   * @param {string} fileId - GridFS file ID
   * @param {Array} selectedStats - Array of stat IDs to calculate
   * @param {string} columnName - Optional: specific column to analyze
   * @returns {Promise<Object>} - Object containing statistics by column
   */
  async calculateStatisticsFromFile(fileId, selectedStats, columnName = null) {
    try {
      const response = await axios.post('/danfo/calculate-from-file', {
        fileId,
        selectedStats,
        columnName
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating statistics from file:', error);
      throw error;
    }
  },

  /**
   * Extract a column from DataFrame as array
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {string} columnName - Name of the column
   * @returns {Array} - Array of values
   */
  getColumn(dataframe, columnName) {
    return dataframe[columnName].values;
  },

  /**
   * Get all numeric columns from a DataFrame
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @returns {Array} - Array of numeric column names
   */
  getNumericColumns(dataframe) {
    const dtypes = dataframe.dtypes;
    const numericTypes = ['int32', 'float32', 'float64'];
    return dtypes
      .filter(dtype => numericTypes.includes(dtype[1]))
      .map(dtype => dtype[0]);
  },

  /**
   * Convert DataFrame to JSON
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @returns {Array} - Array of objects
   */
  toJSON(dataframe) {
    return dfd.toJSON(dataframe);
  },

  /**
   * Export DataFrame to CSV
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {string} filename - Output filename
   */
  exportToCSV(dataframe, filename = 'data.csv') {
    dfd.toCSV(dataframe, { fileName: filename });
  },

  /**
   * Export DataFrame to Excel
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {string} filename - Output filename
   */
  exportToExcel(dataframe, filename = 'data.xlsx') {
    dfd.toExcel(dataframe, { fileName: filename });
  },

  /**
   * Get basic DataFrame information
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @returns {Object} - Information about the DataFrame
   */
  getInfo(dataframe) {
    return {
      shape: dataframe.shape,
      columns: dataframe.columns,
      dtypes: dataframe.dtypes,
      index: dataframe.index
    };
  },

  /**
   * Get DataFrame head (first n rows)
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {number} n - Number of rows
   * @returns {DataFrame} - First n rows
   */
  head(dataframe, n = 5) {
    return dataframe.head(n);
  },

  /**
   * Get DataFrame tail (last n rows)
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {number} n - Number of rows
   * @returns {DataFrame} - Last n rows
   */
  tail(dataframe, n = 5) {
    return dataframe.tail(n);
  },

  /**
   * Filter DataFrame by condition
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {string} column - Column name to filter
   * @param {Function} condition - Condition function
   * @returns {DataFrame} - Filtered DataFrame
   */
  filter(dataframe, column, condition) {
    return dataframe.query(dataframe[column].map(condition));
  },

  /**
   * Group by and aggregate
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {Array} groupBy - Columns to group by
   * @param {Object} aggregations - Aggregation operations
   * @returns {DataFrame} - Grouped DataFrame
   */
  groupBy(dataframe, groupBy, aggregations) {
    return dataframe.groupby(groupBy).agg(aggregations);
  },

  /**
   * Sort DataFrame by column
   * @param {DataFrame} dataframe - Danfo.js DataFrame
   * @param {string} column - Column to sort by
   * @param {boolean} ascending - Sort order
   * @returns {DataFrame} - Sorted DataFrame
   */
  sortBy(dataframe, column, ascending = true) {
    return dataframe.sortValues(column, { ascending });
  }
};

export default danfoService;
