USE Shopeedb;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_getShopProductStatistics $$

-- Get product statistics for a specific shop
CREATE PROCEDURE sp_getShopProductStatistics(
    IN input_shopId INT,
    IN input_min_target INT
)
BEGIN
    -- Default logic for input_min_target
    IF input_min_target IS NULL THEN
        SET input_min_target = 0;
    END IF;

    -- Main query to get product statistics
    SELECT
        p.productID,
        p.name AS ProductName,
        AVG(p.product_Rating) as Rating,
        -- Use COALESCE to display 0 instead of NULL for unsold products
        COALESCE(SUM(oi.quantity), 0) AS TotalUnitsSold,
        COALESCE(SUM(oi.quantity * oi.unit_Price), 0) AS TotalRevenue -- total before comission calculation
    FROM PRODUCT p
    LEFT JOIN ORDER_ITEM oi 
    ON p.productID = oi.productID 
    AND oi.status = 'DELIVERED' -- Only valid sales
    WHERE p.shopID = input_shopId
    GROUP BY p.productID, p.name
    -- Filter based on target
    HAVING TotalUnitsSold >= input_min_target
    ORDER BY TotalRevenue DESC;
END $$

DROP PROCEDURE IF EXISTS sp_searchProducts $$

-- Search products base on price range and category keyword
-- display product details along with the shop name, sorted by price ascending
CREATE PROCEDURE sp_searchProducts(
    IN input_category_keyword VARCHAR(100),
    IN input_min_price DECIMAL(15,2),
    IN input_max_price DECIMAL(15,2)
)
BEGIN
    -- Default logic for price range
    IF input_min_price IS NULL THEN
        SET input_min_price = 0;
    END IF;
    IF input_max_price IS NULL THEN
        SET input_max_price = 999999999; -- Arbitrary high value
    END IF;
    -- Main query to search products
    SELECT
        p.productID,
        p.name AS ProductName,
        s.shopName AS ShopName,
        c.categoryName AS Category,
        p.base_Price AS Price,
        p.product_Rating AS Rating,
        p.description
    FROM PRODUCT p
    JOIN SHOP s ON p.shopID = s.shopID
    JOIN BELONGS_TO_CATEGORY btc ON p.productID = btc.productID
    JOIN CATEGORY c ON btc.categoryID = c.categoryID
    WHERE c.categoryName LIKE CONCAT('%', input_category_keyword, '%')
      AND p.base_Price BETWEEN input_min_price AND input_max_price
    ORDER BY p.base_Price ASC;
END $$

DROP FUNCTION IF EXISTS fn_calculateShopNetRevenue $$

-- Calculate the total net revenue for a specific shop in a given month and year
-- The platform takes different commission rates based on product categories:
-- ELECTRONICS: 2%
-- FASHION: 5%
-- OTHERS: 3%
-- Only consider orders with status 'DELIVERED'
CREATE FUNCTION fn_calculateShopNetRevenue(
    input_shopId INT,
    input_month INT,
    input_year INT
)
RETURNS DECIMAL(15,2)
DETERMINISTIC
BEGIN
    -- Variables declaration
    DECLARE done INT DEFAULT FALSE;
    DECLARE total_revenue DECIMAL(15,2) DEFAULT 0.00;
    DECLARE item_price INT;
    DECLARE item_quantity INT;
    DECLARE cat_name VARCHAR(100);
    DECLARE commission_rate DECIMAL(3,2);
    DECLARE net_amount DECIMAL(15,2);

    -- Declare cursor
    -- Join order_item -> product -> belongs_to_category -> category
    -- Filter by shop, date, status = 'DELIVERED'
    DECLARE cur_items CURSOR FOR
        SELECT oi.unit_Price, oi.quantity, CATEGORY.categoryName
        FROM ORDER_ITEM oi
        JOIN PRODUCT ON oi.productID = PRODUCT.productID
        JOIN BELONGS_TO_CATEGORY btc ON PRODUCT.productID = btc.productID
        JOIN CATEGORY ON btc.categoryID = CATEGORY.categoryID
        WHERE PRODUCT.shopID = input_shopId
          AND MONTH(oi.delivered_date) = input_month
          AND YEAR(oi.delivered_date) = input_year
          AND oi.status = 'DELIVERED';

    -- Reach the end flag
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Validate input
    IF NOT EXISTS (SELECT 1 FROM SHOP WHERE shopID = input_shopId) THEN
        RETURN -1; -- Shop does not exist
    END IF;

    OPEN cur_items;

    read_loops: LOOP
        FETCH cur_items INTO item_price, item_quantity, cat_name;
        IF done THEN
            LEAVE read_loops;
        END IF;

        -- Logic to determine fee
        IF cat_name = 'ELECTRONICS' THEN
            SET commission_rate = 0.02;
        ELSEIF cat_name = 'FASHION' THEN
            SET commission_rate = 0.05;
        ELSE
            SET commission_rate = 0.03; -- standard rate
        END IF;

        -- Calculate net amount for the item
        SET net_amount = (item_price * item_quantity) * (1 - commission_rate);

        -- Accumulate to total revenue
        SET total_revenue = total_revenue + net_amount;

    END LOOP;

    CLOSE cur_items;

    RETURN total_revenue;
END $$

DROP FUNCTION IF EXISTS fn_classifyBuyerRank $$

-- Classify buyer rank (VIP scoring)
-- A buyer is classified as 'Standard', 'Silver', 'Gold', or 'Platinum' based on their total spending and cancellation rate
-- If the buyer has not met the spending threshold for at least6 months, downgrade their rank by one level
-- If the buyer has cancellation rate > 30%, downgrade their rank by one level
CREATE FUNCTION fn_classifyBuyerRank(
    input_buyerId INT
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    -- Variables declaration
    DECLARE done INT DEFAULT FALSE;
    DECLARE total_spending DECIMAL(15,2) DEFAULT 0.00;
    DECLARE recent_spending DECIMAL(15,2) DEFAULT 0.00;
    DECLARE cancel_count INT DEFAULT 0;
    DECLARE total_orders INT DEFAULT 0;

    DECLARE current_status VARCHAR(20);
    DECLARE current_amount DECIMAL(15,2);
    DECLARE order_date DATETIME;

    DECLARE result_rank VARCHAR(20);
    DECLARE rank_score INT DEFAULT 1; -- 1: Standard, 2: Silver, 3: Gold, 4: Platinum
    DECLARE cancel_rate DECIMAL(5,2) DEFAULT 0.00;

    -- Declare cursor
    DECLARE cur_orders CURSOR FOR
        SELECT oi.status, oi.quantity * oi.unit_Price AS total_amount, oi.delivered_date
        FROM ORDER_ITEM oi
        JOIN ORDERS o ON oi.orderID = o.orderID
        WHERE o.buyerID = input_buyerId;

    -- Reach the end flag
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    IF NOT EXISTS (SELECT 1 FROM BUYER WHERE userID = input_buyerId) THEN
        RETURN 'Invalid User'; -- Buyer does not exist
    END IF;

    OPEN cur_orders;

    read_loops: LOOP
        FETCH cur_orders INTO current_status, current_amount, order_date;
        IF done THEN
            LEAVE read_loops;
        END IF;

        -- Always increase total orders count
        SET total_orders = total_orders + 1;

        -- Aggreagate data
        IF current_status = 'DELIVERED' THEN
            -- Add to lifetime spending
            SET total_spending = total_spending + current_amount;

            -- Add to recent spending if within 6 months
            IF order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN
                SET recent_spending = recent_spending + current_amount;
            END IF;

        ELSEIF current_status = 'CANCELED' THEN
            SET cancel_count = cancel_count + 1;
        END IF;

    END LOOP;

    CLOSE cur_orders;

    -- Determine initial rank based on total spending
    IF total_spending >= 10000000 THEN -- >=10M VND
        SET rank_score = 4; -- Platinum
    ELSEIF total_spending >= 5000000 THEN -- >=5M VND
        SET rank_score = 3; -- Gold
    ELSEIF total_spending >= 2000000 THEN -- >=2M VND
        SET rank_score = 2; -- Silver
    ELSE
        SET rank_score = 1; -- Standard
    END IF;

    -- Downgrade rank if cancellation rate > 30%
    IF total_orders > 0 THEN -- Avoid division by zero
        SET cancel_rate = cancel_count / total_orders;
        IF cancel_rate > 0.3 THEN
            SET rank_score = GREATEST(rank_score - 1, 1);
        END IF;
    END IF;

    -- Downgrade rank if recent spending < threshold (40% of required spending for current rank)
    IF (rank_score = 4 AND recent_spending < 4000000) OR
       (rank_score = 3 AND recent_spending < 2000000) OR
       (rank_score = 2 AND recent_spending < 800000) THEN
        SET rank_score = GREATEST(rank_score - 1, 1);
    END IF;

    -- Map rank score to rank name
    IF rank_score = 4 THEN
        SET result_rank = 'Platinum';
    ELSEIF rank_score = 3 THEN
        SET result_rank = 'Gold';
    ELSEIF rank_score = 2 THEN
        SET result_rank = 'Silver';
    ELSE
        SET result_rank = 'Standard';
    END IF;

    RETURN result_rank;
END $$

DELIMITER ;

-- Test
CALL sp_searchProducts('Electronics', 100000, 5000000);
CALL sp_getShopProductStatistics(1, NULL);
SELECT shopID, fn_calculateShopNetRevenue(shopID, 9, 2025) AS total_revenue
FROM SHOP;
SELECT userID, fn_classifyBuyerRank(userID) AS buyer_rank
FROM BUYER;

-- ==============================================================
-- SCENARIO 1: TESTING REVENUE & STATISTICS (Shop 1 - TechZone)
-- Current State: Shop 1 sells 'Tai nghe Bluetooth' (Prod 1).
-- Goal: 
--   1. Add a new expensive product to Shop 1.
--   2. Create orders in Dec 2025 to test 2% Commission (Electronics).
--   3. Leave one product unsold to test NULL/0 handling in Statistics.
-- ==============================================================

-- 1.1 Add a new High-Value Product to Shop 1
INSERT INTO PRODUCT (productID, shopID, name, description, base_Price) 
VALUES (100, 1, 'Gaming Laptop Pro', 'High-end gaming laptop', 20000000); -- 20 Million

INSERT INTO PRODUCT_OPTIONS (productID, optionID, current_Stock) 
VALUES (100, 1, 50);

INSERT INTO BELONGS_TO_CATEGORY (productID, categoryID) 
VALUES (100, 1);

-- 1.2 Add Valid Orders for Dec 2025 (Target for Revenue Function)
-- Buyer 14 buys 2 Laptops (Total 40M). 
-- Commission Logic: 40M * 2% = 800k Fee. Net Revenue = 39.2M.
INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) 
VALUES (14, 4, 40000000, '2025-12-01 10:00:00');

SET @orderID_Rev = LAST_INSERT_ID();

INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (@orderID_Rev, 1, 100, 1, 'DELIVERED', 2, 20000000, '2025-12-05');

INSERT INTO REVIEW (buyerID, productID, rating, comment, date_Posted) VALUES 
(14, 100, 5, 'Excellent performance!', '2025-12-10');


-- Add Product 101 that is NEVER sold to test 'sp_getShopProductStatistics'
INSERT INTO PRODUCT (productID, shopID, name, description, base_Price) 
VALUES (101, 1, 'Old VGA Cable', 'Nobody wants this', 50000);
INSERT INTO PRODUCT_OPTIONS (productID, optionID, current_Stock) VALUES (101, 1, 100);
INSERT INTO BELONGS_TO_CATEGORY (productID, categoryID) VALUES (101, 1);

-- TEST QUERY FOR SCENARIO 1:
-- CALL sp_getShopProductStatistics(1, NULL); 
-- ^ Should show Laptop (2 sold), Tai nghe (2 sold), and VGA Cable (0 sold).


-- ==============================================================
-- SCENARIO 2: TESTING BUYER RANK - PLATINUM (Buyer 11)
-- Current State: Buyer 11 has 1 order of 550k.
-- Goal: Push total spend > 10M to reach Platinum.
-- ==============================================================

INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) 
VALUES (11, 1, 15000000, NOW());

SET @orderID_VIP = LAST_INSERT_ID();

INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (@orderID_VIP, 1, 100, 1, 'DELIVERED', 1, 15000000, NOW());

INSERT INTO REVIEW (buyerID, productID, rating, comment, date_Posted) VALUES 
(11, 100, 4, 'Good value for money.', NOW());

-- TEST QUERY FOR SCENARIO 2:
SELECT fn_classifyBuyerRank(11); 
-- ^ Should return 'Platinum'.


-- ==============================================================
-- SCENARIO 3: TESTING INACTIVITY DOWNGRADE (Buyer 12)
-- Current State: Buyer 12 has 1 order of 2.3M.
-- Goal: Add huge spend (20M) but date it back to 2024.
-- Expectation: Spend > 10M (Platinum Base), but Inactive > 6mo -> Downgrade to Gold.
-- ==============================================================

INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) 
VALUES (12, 2, 20000000, '2024-01-01 00:00:00');

SET @orderID_Inactive = LAST_INSERT_ID();

INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (@orderID_Inactive, 1, 100, 1, 'DELIVERED', 1, 20000000, '2024-01-05');

INSERT INTO REVIEW (buyerID, productID, rating, comment, date_Posted) VALUES 
(12, 100, 5, 'Great product!', '2024-01-10');

-- TEST QUERY FOR SCENARIO 3:
SELECT fn_classifyBuyerRank(12); 
-- ^ Should return 'Gold' (Downgraded from Platinum).


-- ==============================================================
-- SCENARIO 4: TESTING CANCELLATION DOWNGRADE (Buyer 13)
-- Current State: Buyer 13 has 1 order of 320k.
-- Goal: Add spend to reach Gold (>5M), but spam CANCELED orders.
-- Expectation: Base Gold, but Cancel Rate > 30% -> Downgrade to Silver.
-- ==============================================================

-- 4.1 Add Valid Spend (6M)
INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) 
VALUES (13, 3, 6000000, NOW());
SET @orderID_Valid = LAST_INSERT_ID();
INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (@orderID_Valid, 1, 100, 1, 'DELIVERED', 1, 6000000, NOW());

INSERT INTO REVIEW (buyerID, productID, rating, comment, date_Posted) VALUES 
(13, 100, 5, 'Great product!', NOW());

-- 4.2 Add Canceled Orders (3 Orders)
-- Total Orders = 1 (Initial) + 1 (Valid) + 3 (Cancel) = 5.
-- Cancel Count = 3. Rate = 3/5 = 60% (>30%).
INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) VALUES (13, 3, 500000, NOW());
INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (LAST_INSERT_ID(), 1, 100, 1, 'CANCELED', 1, 500000, NULL);

INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) VALUES (13, 3, 500000, NOW());
INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (LAST_INSERT_ID(), 1, 100, 1, 'CANCELED', 1, 500000, NULL);

INSERT INTO ORDERS (buyerID, addressID, total_Amount, order_Date) VALUES (13, 3, 500000, NOW());
INSERT INTO ORDER_ITEM (orderID, optionID, productID, carrierID, status, quantity, unit_Price, delivered_date) 
VALUES (LAST_INSERT_ID(), 1, 100, 1, 'CANCELED', 1, 500000, NULL);

-- TEST QUERY FOR SCENARIO 4:
SELECT fn_classifyBuyerRank(13); 
-- ^ Should return 'Silver' (Downgraded from Gold).

-- 1. Check Revenue for Shop 1 (TechZone) in Dec 2025
-- Should include the 40M order. (40M * 0.98 = 39.2M)
SELECT fn_calculateShopNetRevenue(1, 12, 2025) AS TechZone_Dec_Revenue;

-- 2. Check Statistics for Shop 1
-- Look for 'Old VGA Cable' with 0 Sales.
CALL sp_getShopProductStatistics(1, NULL);
-- should show 5 laptop sold, 2 tai nghe sold, 0 vga cable sold.

-- 3. Check Buyer Ranks
SELECT 
    userID, 
    username, 
    fn_classifyBuyerRank(userID) AS Rank_Calculated
FROM USERS 
WHERE userID IN (11, 12, 13);